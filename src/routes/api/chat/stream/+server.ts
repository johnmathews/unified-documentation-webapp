import { getApiBase } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const res = await fetch(`${getApiBase()}/api/chat/stream`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			return new Response(res.body, {
				status: res.status,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(res.body, {
			status: 200,
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
			},
		});
	} catch {
		return new Response(JSON.stringify({ error: "Backend unavailable" }), {
			status: 502,
			headers: { "Content-Type": "application/json" },
		});
	}
};
