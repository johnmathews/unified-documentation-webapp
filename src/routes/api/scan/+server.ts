import { proxyPost } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async () => {
	return proxyPost("/rescan", {});
};
