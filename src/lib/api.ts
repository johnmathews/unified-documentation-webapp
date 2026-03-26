// All API requests go through SvelteKit server routes (same origin),
// which proxy to the backend. No CORS issues, no build-time config needed.

export interface TreeSource {
	source: string;
	root_docs: TreeDocument[];
	docs: TreeDocument[];
	journal: TreeDocument[];
	engineering_team?: TreeDocument[];
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
	role: 'user' | 'assistant';
	content: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(path, options);
	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body.error || `API error ${res.status}`);
	}
	return res.json();
}

export async function fetchTree(): Promise<TreeSource[]> {
	return apiFetch<TreeSource[]>('/api/tree');
}

export async function fetchDocument(docId: string): Promise<FullDocument> {
	return apiFetch<FullDocument>(`/api/documents/${encodeURIComponent(docId)}`);
}

export async function searchDocuments(
	query: string,
	source?: string
): Promise<SearchResult[]> {
	const params = new URLSearchParams({ q: query });
	if (source) params.set('source', source);
	return apiFetch<SearchResult[]>(`/api/search?${params}`);
}

export async function sendChat(
	message: string,
	docId?: string,
	history?: ChatMessage[]
): Promise<string> {
	const body: Record<string, unknown> = { message };
	if (docId) body.doc_id = docId;
	if (history?.length) body.history = history;

	const result = await apiFetch<{ reply: string }>('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return result.reply;
}
