import { proxyDelete } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ params }) => {
	return proxyDelete(`/api/bookmarks/${params.id}`);
};
