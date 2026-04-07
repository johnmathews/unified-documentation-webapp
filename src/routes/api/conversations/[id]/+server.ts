import { proxyGet, getApiBase } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
 return proxyGet(`/api/conversations/${encodeURIComponent(params.id)}`);
};

export const DELETE: RequestHandler = async ({ params }) => {
 try {
  const res = await fetch(`${getApiBase()}/api/conversations/${encodeURIComponent(params.id)}`, {
   method: "DELETE",
  });
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
};
