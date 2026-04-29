import { env } from "$env/dynamic/private";
import { logger } from "$lib/server/logger";

const SLOW_UPSTREAM_MS = 1000;

export function getApiBase(): string {
 return env.API_URL || "http://localhost:8080";
}

function logUpstream(method: string, path: string, status: number, duration_ms: number): void {
 const fields = {
  event: "upstream_call",
  method,
  upstream_path: path,
  upstream_status: status,
  duration_ms,
 };
 if (status >= 500) {
  logger.error("Upstream returned server error", fields);
 } else if (status >= 400) {
  logger.warn("Upstream returned client error", fields);
 } else if (duration_ms >= SLOW_UPSTREAM_MS) {
  logger.warn("Slow upstream call", fields);
 }
}

function logUpstreamFailure(method: string, path: string, duration_ms: number, err: unknown): void {
 logger.error("Upstream call failed", {
  event: "upstream_error",
  method,
  upstream_path: path,
  duration_ms,
  error: err instanceof Error ? err.message : String(err),
 });
}

export async function proxyGet(path: string): Promise<Response> {
 const start = performance.now();
 try {
  const res = await fetch(`${getApiBase()}${path}`);
  const duration_ms = Math.round(performance.now() - start);
  logUpstream("GET", path, res.status, duration_ms);
  return new Response(res.body, {
   status: res.status,
   headers: { "Content-Type": "application/json" },
  });
 } catch (err) {
  logUpstreamFailure("GET", path, Math.round(performance.now() - start), err);
  return new Response(JSON.stringify({ error: "Backend unavailable" }), {
   status: 502,
   headers: { "Content-Type": "application/json" },
  });
 }
}

export async function proxyGetRaw(path: string): Promise<Response> {
 const start = performance.now();
 try {
  const res = await fetch(`${getApiBase()}${path}`);
  // Buffer the body so we can set Content-Length (required for inline PDF rendering).
  const body = await res.arrayBuffer();
  const duration_ms = Math.round(performance.now() - start);
  logUpstream("GET", path, res.status, duration_ms);
  const headers: Record<string, string> = {
   "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
   "Content-Length": String(body.byteLength),
  };
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) {
   headers["Content-Disposition"] = disposition;
  }
  return new Response(body, { status: res.status, headers });
 } catch (err) {
  logUpstreamFailure("GET", path, Math.round(performance.now() - start), err);
  return new Response("Backend unavailable", {
   status: 502,
   headers: { "Content-Type": "text/plain" },
  });
 }
}

export async function proxyDelete(path: string): Promise<Response> {
 const start = performance.now();
 try {
  const res = await fetch(`${getApiBase()}${path}`, {
   method: "DELETE",
  });
  const duration_ms = Math.round(performance.now() - start);
  logUpstream("DELETE", path, res.status, duration_ms);
  return new Response(res.body, {
   status: res.status,
   headers: { "Content-Type": "application/json" },
  });
 } catch (err) {
  logUpstreamFailure("DELETE", path, Math.round(performance.now() - start), err);
  return new Response(JSON.stringify({ error: "Backend unavailable" }), {
   status: 502,
   headers: { "Content-Type": "application/json" },
  });
 }
}

export async function proxyPost(path: string, body: unknown): Promise<Response> {
 const start = performance.now();
 try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  const res = await fetch(`${getApiBase()}${path}`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify(body),
   signal: controller.signal,
  });
  clearTimeout(timeout);

  const duration_ms = Math.round(performance.now() - start);
  logUpstream("POST", path, res.status, duration_ms);

  return new Response(res.body, {
   status: res.status,
   headers: { "Content-Type": "application/json" },
  });
 } catch (err) {
  const duration_ms = Math.round(performance.now() - start);
  const timedOut = err instanceof Error && err.name === "AbortError";
  logUpstreamFailure("POST", path, duration_ms, timedOut ? new Error("Request timed out after 90s") : err);
  const message = timedOut ? "Request timed out" : "Backend unavailable";
  return new Response(JSON.stringify({ error: message }), {
   status: 502,
   headers: { "Content-Type": "application/json" },
  });
 }
}
