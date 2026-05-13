export const currentDocId = $state<{ value: string | null }>({ value: null });

export const scanTick = $state<{ value: number }>({ value: 0 });

export interface PageContext {
 source?: string;
 category?: string;
}

export const currentPageContext = $state<{ value: PageContext | null }>({ value: null });

export interface TocEntry {
 level: 1 | 2 | 3;
 text: string;
 slug: string;
}

export const currentDocToc = $state<{ value: TocEntry[] }>({ value: [] });

const TOC_OPEN_KEY = "doc-toc-open";

function loadTocOpen(): boolean {
 if (typeof localStorage === "undefined") return true;
 const v = localStorage.getItem(TOC_OPEN_KEY);
 return v === null ? true : v === "true";
}

function createTocOpen() {
 let open = $state<boolean>(loadTocOpen());
 return {
  get value() {
   return open;
  },
  set(next: boolean) {
   open = next;
   if (typeof localStorage !== "undefined") {
    localStorage.setItem(TOC_OPEN_KEY, String(next));
   }
  },
  toggle() {
   this.set(!open);
  },
 };
}

export const tocOpen = createTocOpen();

/** Document type vocabulary. Kept as a frontend mirror of the backend's
 * `doc_type` field, used by the search panel's type-select dropdown. The
 * per-type pill filter UI and the inline type badges were removed; the
 * vocabulary itself stays because the search filter still references it. */
export const DOC_TYPES = [
 { key: "documentation", label: "Documentation" },
 { key: "journal", label: "Journal" },
 { key: "prompt", label: "Prompt" },
 { key: "not-docs", label: "Not docs" },
] as const;

export type DocTypeKey = (typeof DOC_TYPES)[number]["key"];

const EXCLUDE_NOT_DOCS_STORAGE_KEY = "exclude-not-docs";

function loadExcludeNotDocs(): boolean {
 if (typeof localStorage === "undefined") return false;
 return localStorage.getItem(EXCLUDE_NOT_DOCS_STORAGE_KEY) === "true";
}

function createExcludeNotDocs() {
 let value = $state<boolean>(loadExcludeNotDocs());
 return {
  get value() {
   return value;
  },
  set(next: boolean) {
   value = next;
   if (typeof localStorage !== "undefined") {
    localStorage.setItem(EXCLUDE_NOT_DOCS_STORAGE_KEY, String(next));
   }
  },
  toggle() {
   this.set(!value);
  },
 };
}

/** Shared state for the SearchPanel's "exclude non-documentation files"
 * toggle — sends `exclude_types=not-docs` to the backend search endpoint. */
export const excludeNotDocs = createExcludeNotDocs();

const SIDEBAR_EXPANDED_STORAGE_KEY = "sidebar-expanded-sources";

function loadSidebarExpanded(): Record<string, boolean> {
	if (typeof localStorage === "undefined") return {};
	try {
		const stored = JSON.parse(localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY) || "{}");
		if (stored && typeof stored === "object" && !Array.isArray(stored)) {
			const out: Record<string, boolean> = {};
			for (const [k, v] of Object.entries(stored)) {
				if (typeof v === "boolean") out[k] = v;
			}
			return out;
		}
	} catch {
		/* use empty defaults */
	}
	return {};
}

function createSidebarCollapse() {
	let expanded = $state<Record<string, boolean>>(loadSidebarExpanded());

	function persist() {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, JSON.stringify(expanded));
		}
	}

	return {
		get value() {
			return expanded;
		},
		isExpanded(source: string): boolean {
			return expanded[source] === true;
		},
		set(source: string, value: boolean) {
			expanded = { ...expanded, [source]: value };
			persist();
		},
		toggle(source: string) {
			this.set(source, !this.isExpanded(source));
		},
		setMany(updates: Record<string, boolean>) {
			expanded = { ...expanded, ...updates };
			persist();
		},
	};
}

/** Sidebar source-row expansion state, persisted across reloads. All sources
 * default to collapsed; the user opts in to expanding the ones they care
 * about. Unknown sources return `false` from `isExpanded`. */
export const sidebarCollapse = createSidebarCollapse();
