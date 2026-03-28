export const currentDocId = $state<{ value: string | null }>({ value: null });

/** Document category definitions — the single source of truth for category keys and labels. */
export const CATEGORIES = [
	{ key: 'root_docs', label: 'Root Docs' },
	{ key: 'docs', label: 'Documentation' },
	{ key: 'journal', label: 'Journal' },
	{ key: 'engineering_team', label: 'Engineering Team' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

const FILTER_STORAGE_KEY = 'doc-category-filters';

function loadFilters(): Record<CategoryKey, boolean> {
	const defaults: Record<string, boolean> = {};
	for (const c of CATEGORIES) defaults[c.key] = true;
	if (typeof localStorage === 'undefined') return defaults as Record<CategoryKey, boolean>;
	try {
		const stored = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || '{}');
		for (const c of CATEGORIES) {
			if (typeof stored[c.key] === 'boolean') defaults[c.key] = stored[c.key];
		}
	} catch { /* use defaults */ }
	return defaults as Record<CategoryKey, boolean>;
}

function createCategoryFilters() {
	let filters = $state<Record<CategoryKey, boolean>>(loadFilters());

	return {
		get value() { return filters; },
		toggle(key: CategoryKey) {
			filters = { ...filters, [key]: !filters[key] };
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
			}
		},
		isVisible(key: CategoryKey): boolean {
			return filters[key] ?? true;
		}
	};
}

export const categoryFilters = createCategoryFilters();
