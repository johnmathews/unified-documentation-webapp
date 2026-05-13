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

/** Stage 2 document type definitions — single source of truth for the type
 * vocabulary the UI knows about. Server may ship additional types in future
 * (the doc_types.yaml vocabulary block is open-ended); unknown values fall
 * through to "show by default" via {@link typeFilters.isVisible}. */
export const DOC_TYPES = [
 { key: "documentation", label: "Documentation" },
 { key: "journal", label: "Journal" },
 { key: "prompt", label: "Prompt" },
 { key: "not-docs", label: "Not docs" },
] as const;

export type DocTypeKey = (typeof DOC_TYPES)[number]["key"];

const TYPE_FILTER_STORAGE_KEY = "doc-type-filters";

function loadTypeFilters(): Record<DocTypeKey, boolean> {
 const defaults: Record<string, boolean> = {};
 for (const t of DOC_TYPES) defaults[t.key] = true;
 if (typeof localStorage === "undefined") return defaults as Record<DocTypeKey, boolean>;
 try {
  const stored = JSON.parse(localStorage.getItem(TYPE_FILTER_STORAGE_KEY) || "{}");
  for (const t of DOC_TYPES) {
   if (typeof stored[t.key] === "boolean") defaults[t.key] = stored[t.key];
  }
 } catch {
  /* use defaults */
 }
 return defaults as Record<DocTypeKey, boolean>;
}

function createTypeFilters() {
 let filters = $state<Record<DocTypeKey, boolean>>(loadTypeFilters());

 return {
  get value() {
   return filters;
  },
  toggle(key: DocTypeKey) {
   filters = { ...filters, [key]: !filters[key] };
   if (typeof localStorage !== "undefined") {
    localStorage.setItem(TYPE_FILTER_STORAGE_KEY, JSON.stringify(filters));
   }
  },
  /** Returns true for any value not in the known vocabulary so docs that
   * predate Stage 2 (or that the server hasn't classified yet) stay visible
   * rather than disappearing silently. */
  isVisible(type: string | null | undefined): boolean {
   if (!type) return true;
   if (!(type in filters)) return true;
   return filters[type as DocTypeKey];
  },
 };
}

export const typeFilters = createTypeFilters();

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

/** Stage 2 W2.8 shared state for the "exclude non-documentation files"
 * toggle. Used by SearchPanel today; Stage 3 W3.6 will hook the chat view to
 * the same store so the two views stay in sync. */
export const excludeNotDocs = createExcludeNotDocs();

/** Location-based category vocabulary. Distinct from `DOC_TYPES`: these are
 * client-side path classifications, not server-side doc types. The pill row
 * is purely additive — the underlying `TreeDocument.type` is unaffected. */
export const CATEGORY_FILTERS = [
	{ key: "bookmarks", label: "Bookmarks" },
	{ key: "engineering-team", label: "Engineering team" },
	{ key: "learning-journal", label: "Learning journal" },
	{ key: "dev-journal", label: "Dev journal" },
	{ key: "root-docs", label: "Root docs" },
] as const;

export type CategoryKey = (typeof CATEGORY_FILTERS)[number]["key"];

/** Path → category classifier. Returns the first matching category from path
 * structure, or null if none match. `bookmarks` is never returned here —
 * bookmark membership is determined by `doc_id`, not path, and is handled
 * by the sidebar at render time. */
export function categoryOf(file_path: string): Exclude<CategoryKey, "bookmarks"> | null {
	if (file_path.startsWith(".engineering-team/")) return "engineering-team";
	if (file_path.startsWith("journal/")) return "dev-journal";
	if (file_path.startsWith("learning/")) return "learning-journal";
	if (!file_path.includes("/")) return "root-docs";
	return null;
}

const CATEGORY_FILTER_STORAGE_KEY = "category-filters";

function loadCategoryFilters(): Record<CategoryKey, boolean> {
	const defaults: Record<string, boolean> = {};
	for (const c of CATEGORY_FILTERS) defaults[c.key] = false;
	if (typeof localStorage === "undefined") return defaults as Record<CategoryKey, boolean>;
	try {
		const stored = JSON.parse(localStorage.getItem(CATEGORY_FILTER_STORAGE_KEY) || "{}");
		for (const c of CATEGORY_FILTERS) {
			if (typeof stored[c.key] === "boolean") defaults[c.key] = stored[c.key];
		}
	} catch {
		/* use defaults */
	}
	return defaults as Record<CategoryKey, boolean>;
}

function createCategoryFilters() {
	let filters = $state<Record<CategoryKey, boolean>>(loadCategoryFilters());

	return {
		get value() {
			return filters;
		},
		toggle(key: CategoryKey) {
			filters = { ...filters, [key]: !filters[key] };
			if (typeof localStorage !== "undefined") {
				localStorage.setItem(CATEGORY_FILTER_STORAGE_KEY, JSON.stringify(filters));
			}
		},
		/** True if any category is currently active. When false, the filter is
		 * "off" and every file passes through. */
		get anyActive(): boolean {
			return Object.values(filters).some((v) => v);
		},
		/** Path-based visibility. `bookmarks` is intentionally ignored here —
		 * the sidebar layers bookmark visibility on top after computing this. */
		isVisible(file_path: string): boolean {
			if (!this.anyActive) return true;
			const cat = categoryOf(file_path);
			if (cat && filters[cat]) return true;
			return false;
		},
	};
}

/** Second filter row in the sidebar. Defaults all off (the filter is opt-in);
 * when nothing is active, every file passes through. */
export const categoryFilters = createCategoryFilters();

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
