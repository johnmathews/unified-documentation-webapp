import { env } from "$env/dynamic/private";

export function getApiBase(): string {
 return env.API_URL || "http://localhost:8085";
}

export async function proxyGet(path: string): Promise<Response> {
 try {
  const res = await fetch(`${getApiBase()}${path}`);
  return new Response(res.body, {
   status: res.status,
   headers: { "Content-Type": "application/json" },
  });
 } catch {
  return new Response(JSON.stringify({ error: "Backend unavailable" }), {
   status: 502,
   headers: { "Content-Type": "application/json" },
  });
 }
}

export async function proxyPost(path: string, body: unknown): Promise<Response> {
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

  return new Response(res.body, {
   status: res.status,
   headers: { "Content-Type": "application/json" },
  });
 } catch (err) {
  const message = err instanceof Error && err.name === "AbortError" ? "Request timed out" : "Backend unavailable";
  return new Response(JSON.stringify({ error: message }), {
   status: 502,
   headers: { "Content-Type": "application/json" },
  });
 }
}
