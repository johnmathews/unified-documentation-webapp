import { proxyGet } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
 return proxyGet("/api/tree");
};
