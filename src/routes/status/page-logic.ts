export type SortKey =
	| "source"
	| "source_status"
	| "file_count"
	| "chunk_count"
	| "last_indexed"
	| "last_checked";

export const SORT_KEYS: SortKey[] = [
	"source",
	"source_status",
	"file_count",
	"chunk_count",
	"last_indexed",
	"last_checked",
];

export interface SortState {
	key: SortKey;
	asc: boolean;
}

export const DEFAULT_SORT: SortState = { key: "last_indexed", asc: false };

/** Sort keys whose natural default direction is ascending (text columns). */
const ASC_DEFAULT_KEYS: SortKey[] = ["source", "source_status"];

/** Read sort state from URLSearchParams, falling back to defaults for any
 *  unknown or missing values. Never throws. */
export function parseSortParams(params: URLSearchParams): SortState {
	const rawKey = params.get("sort");
	const rawDir = params.get("dir");
	if (!rawKey || !SORT_KEYS.includes(rawKey as SortKey)) {
		return DEFAULT_SORT;
	}
	const key = rawKey as SortKey;
	let asc: boolean;
	if (rawDir === "asc") asc = true;
	else if (rawDir === "desc") asc = false;
	else asc = ASC_DEFAULT_KEYS.includes(key);
	return { key, asc };
}

/** Build a `?sort=…&dir=…` query string for the given sort state.
 *  Returns "" when the state is the default (no params needed).
 *  Returns just "?sort=…" when only the key differs and the dir matches that key's default. */
export function buildSortQuery(state: SortState): string {
	if (state.key === DEFAULT_SORT.key && state.asc === DEFAULT_SORT.asc) {
		return "";
	}
	const params = new URLSearchParams();
	params.set("sort", state.key);
	const keyDefaultAsc = ASC_DEFAULT_KEYS.includes(state.key);
	if (state.asc !== keyDefaultAsc) {
		params.set("dir", state.asc ? "asc" : "desc");
	}
	return `?${params.toString()}`;
}

/** Polling interval for /status live refresh. */
export const POLL_INTERVAL_MS = 30_000;
