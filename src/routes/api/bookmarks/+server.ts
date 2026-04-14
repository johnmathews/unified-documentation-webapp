import { proxyGet, proxyPost } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get("user_id") || "default";
	return proxyGet(`/api/bookmarks?user_id=${encodeURIComponent(userId)}`);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	return proxyPost("/api/bookmarks", body);
};
