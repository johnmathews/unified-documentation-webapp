import { proxyGet } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
 const query = url.searchParams.toString();
 return proxyGet(`/api/search?${query}`);
};
