import { proxyPost } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	return proxyPost("/api/bookmarks/check", body);
};
