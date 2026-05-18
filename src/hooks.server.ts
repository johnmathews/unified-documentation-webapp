import type { Handle, HandleServerError } from "@sveltejs/kit";
import { getApiBase } from "$lib/server/api";
import { logger, newRequestId } from "$lib/server/logger";
import { buildCspHeader } from "$lib/server/csp";

logger.info("Webapp starting", {
 event: "server_start",
 api_url: getApiBase(),
 node_env: process.env.NODE_ENV ?? "development",
 port: process.env.PORT ?? "3000",
});

export const handle: Handle = async ({ event, resolve }) => {
 const requestId = newRequestId();
 const start = performance.now();
 event.locals.requestId = requestId;

 const response = await resolve(event);

 // CSP is defence-in-depth on top of the DOMPurify sanitisation that runs
 // on every {@html ...} render path (src/lib/sanitise.ts). The header
 // constrains what the browser will execute even if a sanitiser bypass
 // shipped. See docs/architecture.md for the policy rationale.
 if (!response.headers.has("content-security-policy")) {
  response.headers.set("content-security-policy", buildCspHeader());
 }

 const duration_ms = Math.round(performance.now() - start);
 const status = response.status;
 const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

 logger[level]("Request completed", {
  event: "request_done",
  request_id: requestId,
  method: event.request.method,
  path: event.url.pathname,
  status,
  duration_ms,
 });

 return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
 logger.error("Unhandled server error", {
  event: "server_error",
  request_id: event.locals.requestId,
  path: event.url.pathname,
  error: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
 });
 return { message: "Internal server error" };
};
