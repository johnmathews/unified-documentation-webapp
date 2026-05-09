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

/** Document category definitions — the single source of truth for category keys and labels. */
export const CATEGORIES = [
 { key: "root_docs", label: "Root Docs" },
 { key: "docs", label: "Documentation Directory" },
 { key: "journal", label: "Journal" },
 { key: "learning_journal", label: "Learning Journal" },
 { key: "engineering_team", label: "Engineering Team" },
 { key: "research", label: "Research" },
 { key: "skills", label: "Skills" },
 { key: "runbooks", label: "Runbooks" },
 { key: "pdf", label: "PDF" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

const FILTER_STORAGE_KEY = "doc-category-filters";

function loadFilters(): Record<CategoryKey, boolean> {
 const defaults: Record<string, boolean> = {};
 for (const c of CATEGORIES) defaults[c.key] = true;
 if (typeof localStorage === "undefined") return defaults as Record<CategoryKey, boolean>;
 try {
  const stored = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || "{}");
  for (const c of CATEGORIES) {
   if (typeof stored[c.key] === "boolean") defaults[c.key] = stored[c.key];
  }
 } catch {
  /* use defaults */
 }
 return defaults as Record<CategoryKey, boolean>;
}

function createCategoryFilters() {
 let filters = $state<Record<CategoryKey, boolean>>(loadFilters());

 return {
  get value() {
   return filters;
  },
  toggle(key: CategoryKey) {
   filters = { ...filters, [key]: !filters[key] };
   if (typeof localStorage !== "undefined") {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
   }
  },
  isVisible(key: CategoryKey): boolean {
   return filters[key] ?? true;
  },
 };
}

export const categoryFilters = createCategoryFilters();
