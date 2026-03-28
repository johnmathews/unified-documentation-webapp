import { proxyGet } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
 return proxyGet(`/api/documents/${params.id}`);
};
