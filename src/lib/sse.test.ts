import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseSSE } from "$lib/api";
import type { StreamCallbacks } from "$lib/api";

// ---------------------------------------------------------------------------
// parseSSE – pure function tests
// ---------------------------------------------------------------------------

describe("parseSSE", () => {
	it("parses a standard event with LF line endings", () => {
		const result = parseSSE('event: status\ndata: {"status":"thinking"}');
		expect(result).toEqual({ event: "status", data: '{"status":"thinking"}' });
	});

	it("defaults event to 'message' when no event line is present", () => {
		const result = parseSSE('data: {"hello":"world"}');
		expect(result).toEqual({ event: "message", data: '{"hello":"world"}' });
	});

	it("handles multiline data fields", () => {
		const result = parseSSE("event: reply\ndata: line1\ndata: line2");
		expect(result).toEqual({ event: "reply", data: "line1\nline2" });
	});

	it("returns null when no data lines are present", () => {
		expect(parseSSE("event: status")).toBeNull();
		expect(parseSSE(": comment only")).toBeNull();
		expect(parseSSE("")).toBeNull();
	});

	it("ignores comment lines (starting with ':')", () => {
		const result = parseSSE(': keep-alive\ndata: {"ok":true}');
		expect(result).toEqual({ event: "message", data: '{"ok":true}' });
	});

	it("trims whitespace from event and data values", () => {
		const result = parseSSE("event:  reply \ndata:  hello ");
		expect(result).toEqual({ event: "reply", data: "hello" });
	});

	it("handles event with JSON object data", () => {
		const raw = 'event: tool_call\ndata: {"index":0,"tool":"search_docs","input":{"query":"test"}}';
		const result = parseSSE(raw);
		expect(result).not.toBeNull();
		const parsed = JSON.parse(result!.data);
		expect(parsed.tool).toBe("search_docs");
		expect(parsed.input.query).toBe("test");
	});
});

// ---------------------------------------------------------------------------
// streamChat – integration tests with mocked fetch/ReadableStream
// ---------------------------------------------------------------------------

describe("streamChat", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	/** Build a ReadableStream that emits the given chunks as Uint8Array. */
	function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
		const encoder = new TextEncoder();
		let i = 0;
		return new ReadableStream({
			pull(controller) {
				if (i < chunks.length) {
					controller.enqueue(encoder.encode(chunks[i]));
					i++;
				} else {
					controller.close();
				}
			},
		});
	}

	function mockFetchOk(chunks: string[]) {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				body: makeStream(chunks),
			}),
		);
	}

	function mockFetchError(status: number, body: object) {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status,
				statusText: "Bad Request",
				json: () => Promise.resolve(body),
			}),
		);
	}

	it("dispatches status, tool_call, tool_result, and reply events", async () => {
		const { streamChat } = await import("$lib/api");

		const events =
			'event: status\ndata: {"status":"thinking"}\n\n' +
			'event: tool_call\ndata: {"index":0,"tool":"search_docs","input":{"query":"hello"}}\n\n' +
			'event: tool_result\ndata: {"index":0,"tool":"search_docs","summary":"3 results found"}\n\n' +
			'event: reply\ndata: {"reply":"Here is the answer","conversation_id":"abc123"}\n\n';

		mockFetchOk([events]);

		const callbacks: StreamCallbacks = {
			onStatus: vi.fn(),
			onToolCall: vi.fn(),
			onToolResult: vi.fn(),
			onReply: vi.fn(),
			onError: vi.fn(),
		};

		await streamChat("hello", callbacks);

		expect(callbacks.onStatus).toHaveBeenCalledWith({ status: "thinking" });
		expect(callbacks.onToolCall).toHaveBeenCalledWith({
			index: 0,
			tool: "search_docs",
			input: { query: "hello" },
		});
		expect(callbacks.onToolResult).toHaveBeenCalledWith({
			index: 0,
			tool: "search_docs",
			summary: "3 results found",
		});
		expect(callbacks.onReply).toHaveBeenCalledWith({
			reply: "Here is the answer",
			conversation_id: "abc123",
		});
		expect(callbacks.onError).not.toHaveBeenCalled();
	});

	it("handles CRLF line endings from sse-starlette", async () => {
		const { streamChat } = await import("$lib/api");

		// sse-starlette sends \r\n line endings and \r\n\r\n event separators
		const events =
			'event: status\r\ndata: {"status":"thinking"}\r\n\r\n' +
			'event: reply\r\ndata: {"reply":"done","conversation_id":"x"}\r\n\r\n';

		mockFetchOk([events]);

		const callbacks: StreamCallbacks = {
			onStatus: vi.fn(),
			onReply: vi.fn(),
		};

		await streamChat("test", callbacks);

		expect(callbacks.onStatus).toHaveBeenCalledWith({ status: "thinking" });
		expect(callbacks.onReply).toHaveBeenCalledWith({
			reply: "done",
			conversation_id: "x",
		});
	});

	it("handles events split across multiple chunks", async () => {
		const { streamChat } = await import("$lib/api");

		// Event split mid-way across two chunks
		const chunk1 = 'event: status\ndata: {"status":"think';
		const chunk2 = 'ing"}\n\nevent: reply\ndata: {"reply":"ok","conversation_id":"z"}\n\n';

		mockFetchOk([chunk1, chunk2]);

		const callbacks: StreamCallbacks = {
			onStatus: vi.fn(),
			onReply: vi.fn(),
		};

		await streamChat("test", callbacks);

		expect(callbacks.onStatus).toHaveBeenCalledWith({ status: "thinking" });
		expect(callbacks.onReply).toHaveBeenCalledWith({
			reply: "ok",
			conversation_id: "z",
		});
	});

	it("dispatches error events and does not throw", async () => {
		const { streamChat } = await import("$lib/api");

		const events = 'event: error\ndata: {"error":"Rate limit reached"}\n\n';
		mockFetchOk([events]);

		const callbacks: StreamCallbacks = {
			onError: vi.fn(),
			onReply: vi.fn(),
		};

		await streamChat("test", callbacks);

		expect(callbacks.onError).toHaveBeenCalledWith("Rate limit reached");
		expect(callbacks.onReply).not.toHaveBeenCalled();
	});

	it("throws on connection lost when no reply or error received", async () => {
		const { streamChat } = await import("$lib/api");

		// Stream with only a status event, no reply or error
		const events = 'event: status\ndata: {"status":"thinking"}\n\n';
		mockFetchOk([events]);

		const callbacks: StreamCallbacks = {
			onStatus: vi.fn(),
		};

		await expect(streamChat("test", callbacks)).rejects.toThrow(
			"Connection lost — no response received",
		);
	});

	it("throws on non-OK HTTP response", async () => {
		const { streamChat } = await import("$lib/api");

		mockFetchError(503, { error: "ANTHROPIC_API_KEY not configured on server" });

		await expect(streamChat("test", {})).rejects.toThrow(
			"ANTHROPIC_API_KEY not configured on server",
		);
	});

	it("includes optional fields in request body", async () => {
		const { streamChat } = await import("$lib/api");

		const events = 'event: reply\ndata: {"reply":"ok","conversation_id":"c1"}\n\n';
		mockFetchOk([events]);

		await streamChat(
			"hello",
			{},
			"source:doc.md",
			[{ role: "user", content: "prior" }, { role: "assistant", content: "resp" }],
			{ source: "myrepo", category: "docs" },
			"conv-123",
		);

		const fetchCall = vi.mocked(fetch).mock.calls[0];
		const body = JSON.parse(fetchCall[1]!.body as string);
		expect(body.message).toBe("hello");
		expect(body.doc_id).toBe("source:doc.md");
		expect(body.history).toHaveLength(2);
		expect(body.page_context).toEqual({ source: "myrepo", category: "docs" });
		expect(body.conversation_id).toBe("conv-123");
	});

	it("skips ping/comment-only SSE frames", async () => {
		const { streamChat } = await import("$lib/api");

		const events =
			': ping\n\n' +
			'event: reply\ndata: {"reply":"done","conversation_id":"p"}\n\n';
		mockFetchOk([events]);

		const callbacks: StreamCallbacks = { onReply: vi.fn() };
		await streamChat("test", callbacks);

		expect(callbacks.onReply).toHaveBeenCalledTimes(1);
	});
});
