// All API requests go through SvelteKit server routes (same origin),
// which proxy to the backend. No CORS issues, no build-time config needed.

export interface TreeSource {
 source: string;
 root_docs: TreeDocument[];
 docs: TreeDocument[];
 journal: TreeDocument[];
 learning_journal?: TreeDocument[];
 engineering_team?: TreeDocument[];
 research?: TreeDocument[];
 pdf?: TreeDocument[];
 skills?: TreeDocument[];
 runbooks?: TreeDocument[];
}

export interface TreeDocument {
 doc_id: string;
 source: string;
 file_path: string;
 title: string | null;
 created_at: string | null;
 modified_at: string | null;
 size_bytes: number | null;
}

export interface FullDocument {
 doc_id: string;
 source: string;
 file_path: string;
 title: string | null;
 content: string | null;
 created_at: string | null;
 modified_at: string | null;
 size_bytes: number | null;
}

export interface SearchResult {
 doc_id: string;
 source: string;
 file_path: string;
 title: string | null;
 created_at: string | null;
 modified_at: string | null;
 score: number;
 snippet: string;
}

export interface ChatMessage {
 role: "user" | "assistant";
 content: string;
}

export interface HealthSource {
 source: string;
 source_status: "healthy" | "warning" | "error" | "unknown";
 file_count: number;
 chunk_count: number;
 last_indexed: string | null;
 last_checked: string | null;
 last_error: string | null;
 last_error_at: string | null;
 consecutive_failures: number;
}

export interface HealthStatus {
 status: "healthy" | "degraded" | "error";
 total_sources: number;
 total_chunks: number;
 poll_interval_seconds: number;
 sources: HealthSource[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
 const res = await fetch(path, options);
 if (!res.ok) {
  const body = await res.json().catch(() => ({ error: res.statusText }));
  throw new Error(body.error || `API error ${res.status}`);
 }
 return res.json();
}

export async function fetchHealth(): Promise<HealthStatus> {
 return apiFetch<HealthStatus>("/api/health");
}

export async function fetchTree(): Promise<TreeSource[]> {
 return apiFetch<TreeSource[]>("/api/tree");
}

export async function fetchDocument(docId: string): Promise<FullDocument> {
 return apiFetch<FullDocument>(`/api/documents/${encodeURIComponent(docId)}`);
}

export interface SearchFilters {
 source?: string;
 docType?: string;
 createdAfter?: string;
 createdBefore?: string;
 modifiedAfter?: string;
 modifiedBefore?: string;
}

export async function searchDocuments(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
 const params = new URLSearchParams({ q: query });
 if (filters?.source) params.set("source", filters.source);
 const results = await apiFetch<SearchResult[]>(`/api/search?${params}`);
 return filterResults(results, filters);
}

export function categorizeFilePath(filePath: string): string {
 if (filePath.toLowerCase().endsWith(".pdf")) return "pdf";
 if (filePath.includes("learning/") || filePath.includes("learning\\")) return "learning_journal";
 if (filePath.includes("journal/") || filePath.includes("journal\\")) return "journal";
 if (filePath.includes(".engineering-team/") || filePath.includes(".engineering-team\\")) return "engineering_team";
 if (filePath.includes("research/") || filePath.includes("research\\")) return "research";
 if (filePath.includes("skills/") || filePath.includes("skills\\")) return "skills";
 if (filePath.includes("runbooks/") || filePath.includes("runbooks\\")) return "runbooks";
 if (filePath.includes("/") || filePath.includes("\\")) return "docs";
 return "root_docs";
}

function filterResults(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
 if (!filters) return results;
 return results.filter((r) => {
  if (filters.docType) {
   const category = categorizeFilePath(r.file_path || "");
   if (category !== filters.docType) return false;
  }
  if (filters.createdAfter && r.created_at && r.created_at < filters.createdAfter) return false;
  if (filters.createdBefore && r.created_at && r.created_at > filters.createdBefore) return false;
  if (filters.modifiedAfter && r.modified_at && r.modified_at < filters.modifiedAfter) return false;
  if (filters.modifiedBefore && r.modified_at && r.modified_at > filters.modifiedBefore) return false;
  return true;
 });
}

export async function fetchSources(): Promise<string[]> {
 const health = await fetchHealth();
 return health.sources.map((s) => s.source);
}

export interface PageContext {
 source?: string;
 category?: string;
}

export interface ChatResponse {
 reply: string;
 conversation_id: string;
}

export async function sendChat(
 message: string,
 docId?: string,
 history?: ChatMessage[],
 pageContext?: PageContext,
 conversationId?: string,
): Promise<ChatResponse> {
 const body: Record<string, unknown> = { message };
 if (docId) body.doc_id = docId;
 if (pageContext) body.page_context = pageContext;
 if (history?.length) body.history = history;
 if (conversationId) body.conversation_id = conversationId;

 return apiFetch<ChatResponse>("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
 });
}

// ---- Streaming chat (SSE) ----

export interface StreamCallbacks {
	onStatus?: (data: { status: string; iteration?: number }) => void;
	onToolCall?: (data: { index: number; tool: string; input: Record<string, unknown> }) => void;
	onToolResult?: (data: { index: number; tool: string; summary: string }) => void;
	onReply?: (data: ChatResponse) => void;
	onError?: (error: string) => void;
}

export async function streamChat(
	message: string,
	callbacks: StreamCallbacks,
	docId?: string,
	history?: ChatMessage[],
	pageContext?: PageContext,
	conversationId?: string,
): Promise<void> {
	const body: Record<string, unknown> = { message };
	if (docId) body.doc_id = docId;
	if (pageContext) body.page_context = pageContext;
	if (history?.length) body.history = history;
	if (conversationId) body.conversation_id = conversationId;

	const response = await fetch("/api/chat/stream", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		throw new Error((err as { error?: string }).error || `API error ${response.status}`);
	}

	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let gotReplyOrError = false;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");

		const parts = buffer.split("\n\n");
		buffer = parts.pop()!;

		for (const part of parts) {
			if (!part.trim()) continue;
			const parsed = parseSSE(part);
			if (!parsed) continue;

			switch (parsed.event) {
				case "status":
					callbacks.onStatus?.(JSON.parse(parsed.data));
					break;
				case "tool_call":
					callbacks.onToolCall?.(JSON.parse(parsed.data));
					break;
				case "tool_result":
					callbacks.onToolResult?.(JSON.parse(parsed.data));
					break;
				case "reply":
					callbacks.onReply?.(JSON.parse(parsed.data));
					gotReplyOrError = true;
					break;
				case "error":
					callbacks.onError?.(JSON.parse(parsed.data).error);
					gotReplyOrError = true;
					break;
			}
		}
	}

	if (!gotReplyOrError) {
		throw new Error("Connection lost — no response received");
	}
}

export function parseSSE(raw: string): { event: string; data: string } | null {
	let event = "message";
	const dataLines: string[] = [];

	for (const line of raw.split("\n")) {
		if (line.startsWith("event:")) {
			event = line.slice(6).trim();
		} else if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).trim());
		}
	}

	if (dataLines.length === 0) return null;
	return { event, data: dataLines.join("\n") };
}

export interface ConversationSummary {
 id: string;
 title: string;
 created_at: string;
 updated_at: string;
 message_count: number;
 preview: string;
}

export interface ConversationFull {
 id: string;
 title: string;
 created_at: string;
 updated_at: string;
 page_context: PageContext | null;
 messages: ChatMessage[];
}

export async function listConversations(): Promise<ConversationSummary[]> {
 return apiFetch<ConversationSummary[]>("/api/conversations");
}

export async function getConversation(id: string): Promise<ConversationFull> {
 return apiFetch<ConversationFull>(`/api/conversations/${encodeURIComponent(id)}`);
}

export async function deleteConversation(id: string): Promise<void> {
 await apiFetch<{ deleted: boolean }>(`/api/conversations/${encodeURIComponent(id)}`, {
  method: "DELETE",
 });
}
