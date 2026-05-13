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
