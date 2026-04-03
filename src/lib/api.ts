// All API requests go through SvelteKit server routes (same origin),
// which proxy to the backend. No CORS issues, no build-time config needed.

export interface TreeSource {
 source: string;
 root_docs: TreeDocument[];
 docs: TreeDocument[];
 journal: TreeDocument[];
 learning_journal?: TreeDocument[];
 engineering_team?: TreeDocument[];
 pdf?: TreeDocument[];
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

export async function sendChat(message: string, docId?: string, history?: ChatMessage[]): Promise<string> {
 const body: Record<string, unknown> = { message };
 if (docId) body.doc_id = docId;
 if (history?.length) body.history = history;

 const result = await apiFetch<{ reply: string }>("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
 });
 return result.reply;
}
