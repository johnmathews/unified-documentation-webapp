import { proxyGetRaw } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
 return proxyGetRaw(`/api/files/${params.id}`);
};
