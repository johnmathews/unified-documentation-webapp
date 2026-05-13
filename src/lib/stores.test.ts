import { describe, it, expect, beforeEach } from "vitest";
import {
	CATEGORY_FILTERS,
	categoryFilters,
	categoryOf,
	DOC_TYPES,
	excludeNotDocs,
	sidebarCollapse,
	typeFilters,
} from "$lib/stores.svelte";

const TYPE_KEY = "doc-type-filters";
const EXCLUDE_KEY = "exclude-not-docs";
const CATEGORY_KEY = "category-filters";
const SIDEBAR_KEY = "sidebar-expanded-sources";

function resetCategoryFilters() {
	for (const c of CATEGORY_FILTERS) {
		if (categoryFilters.value[c.key]) categoryFilters.toggle(c.key);
	}
}

function resetSidebarCollapse() {
	for (const key of Object.keys(sidebarCollapse.value)) {
		sidebarCollapse.set(key, false);
	}
}

describe("DOC_TYPES", () => {
	it("lists the four Stage 2 document types in vocabulary order", () => {
		expect(DOC_TYPES.map((t) => t.key)).toEqual([
			"documentation",
			"journal",
			"prompt",
			"not-docs",
		]);
	});

	it("has a human label for every key", () => {
		for (const t of DOC_TYPES) {
			expect(t.label.length).toBeGreaterThan(0);
		}
	});
});

describe("typeFilters", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("defaults every type to visible", () => {
		for (const t of DOC_TYPES) {
			expect(typeFilters.isVisible(t.key)).toBe(true);
		}
	});

	it("treats undefined / null type as always visible (server hasn't classified yet)", () => {
		expect(typeFilters.isVisible(undefined)).toBe(true);
		expect(typeFilters.isVisible(null)).toBe(true);
		expect(typeFilters.isVisible("")).toBe(true);
	});

	it("treats unknown types as visible (forward compatibility with future vocabulary)", () => {
		expect(typeFilters.isVisible("future-type")).toBe(true);
	});

	it("hides a type after toggling and re-shows after toggling again", () => {
		typeFilters.toggle("journal");
		expect(typeFilters.isVisible("journal")).toBe(false);
		typeFilters.toggle("journal");
		expect(typeFilters.isVisible("journal")).toBe(true);
	});

	it("persists changes to localStorage under the documented key", () => {
		typeFilters.toggle("prompt");
		const stored = JSON.parse(localStorage.getItem(TYPE_KEY) || "{}");
		expect(stored.prompt).toBe(false);
		typeFilters.toggle("prompt");
	});
});

describe("excludeNotDocs", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("persists to localStorage", () => {
		excludeNotDocs.set(true);
		expect(localStorage.getItem(EXCLUDE_KEY)).toBe("true");
		excludeNotDocs.set(false);
		expect(localStorage.getItem(EXCLUDE_KEY)).toBe("false");
	});

	it("toggle flips the value", () => {
		excludeNotDocs.set(false);
		excludeNotDocs.toggle();
		expect(excludeNotDocs.value).toBe(true);
		excludeNotDocs.toggle();
		expect(excludeNotDocs.value).toBe(false);
	});
});

describe("categoryOf", () => {
	it("classifies .engineering-team paths", () => {
		expect(categoryOf(".engineering-team/eval.md")).toBe("engineering-team");
		expect(categoryOf(".engineering-team/sub/dir/x.md")).toBe("engineering-team");
	});

	it("classifies journal/ paths as dev-journal", () => {
		expect(categoryOf("journal/240101.md")).toBe("dev-journal");
	});

	it("classifies learning/ paths as learning-journal", () => {
		expect(categoryOf("learning/notes.md")).toBe("learning-journal");
	});

	it("classifies repo-root files (no slash) as root-docs", () => {
		expect(categoryOf("README.md")).toBe("root-docs");
		expect(categoryOf("CLAUDE.md")).toBe("root-docs");
		expect(categoryOf("CHANGELOG.md")).toBe("root-docs");
	});

	it("returns null for paths that don't match any category", () => {
		expect(categoryOf("docs/index.md")).toBeNull();
		expect(categoryOf("src/lib/foo.ts")).toBeNull();
	});
});

describe("categoryFilters", () => {
	beforeEach(() => {
		localStorage.clear();
		resetCategoryFilters();
	});

	it("defaults every category to off (filter is opt-in)", () => {
		for (const c of CATEGORY_FILTERS) {
			expect(categoryFilters.value[c.key]).toBe(false);
		}
		expect(categoryFilters.anyActive).toBe(false);
	});

	it("treats every file as visible when no category is active", () => {
		expect(categoryFilters.isVisible("journal/x.md")).toBe(true);
		expect(categoryFilters.isVisible("docs/y.md")).toBe(true);
		expect(categoryFilters.isVisible("anything/at/all.md")).toBe(true);
	});

	it("whitelists only matching paths when at least one category is active", () => {
		categoryFilters.toggle("dev-journal");
		expect(categoryFilters.anyActive).toBe(true);
		expect(categoryFilters.isVisible("journal/x.md")).toBe(true);
		expect(categoryFilters.isVisible("docs/y.md")).toBe(false);
		expect(categoryFilters.isVisible("README.md")).toBe(false);
	});

	it("ORs multiple active categories together", () => {
		categoryFilters.toggle("dev-journal");
		categoryFilters.toggle("root-docs");
		expect(categoryFilters.isVisible("journal/x.md")).toBe(true);
		expect(categoryFilters.isVisible("README.md")).toBe(true);
		expect(categoryFilters.isVisible("docs/y.md")).toBe(false);
	});

	it("does NOT include bookmarks in path-based visibility (sidebar handles those)", () => {
		categoryFilters.toggle("bookmarks");
		// `bookmarks` being on doesn't whitelist anything via path.
		expect(categoryFilters.isVisible("journal/x.md")).toBe(false);
		expect(categoryFilters.isVisible("README.md")).toBe(false);
	});

	it("persists toggles to localStorage", () => {
		categoryFilters.toggle("engineering-team");
		const stored = JSON.parse(localStorage.getItem(CATEGORY_KEY) || "{}");
		expect(stored["engineering-team"]).toBe(true);
	});
});

describe("sidebarCollapse", () => {
	beforeEach(() => {
		localStorage.clear();
		resetSidebarCollapse();
	});

	it("returns false for unknown sources by default", () => {
		expect(sidebarCollapse.isExpanded("nothing")).toBe(false);
	});

	it("set + isExpanded round-trip", () => {
		sidebarCollapse.set("alpha", true);
		expect(sidebarCollapse.isExpanded("alpha")).toBe(true);
		sidebarCollapse.set("alpha", false);
		expect(sidebarCollapse.isExpanded("alpha")).toBe(false);
	});

	it("toggle flips the value", () => {
		sidebarCollapse.toggle("beta");
		expect(sidebarCollapse.isExpanded("beta")).toBe(true);
		sidebarCollapse.toggle("beta");
		expect(sidebarCollapse.isExpanded("beta")).toBe(false);
	});

	it("setMany updates multiple keys atomically", () => {
		sidebarCollapse.setMany({ a: true, b: true, c: false });
		expect(sidebarCollapse.isExpanded("a")).toBe(true);
		expect(sidebarCollapse.isExpanded("b")).toBe(true);
		expect(sidebarCollapse.isExpanded("c")).toBe(false);
	});

	it("persists state to localStorage under the documented key", () => {
		sidebarCollapse.set("gamma", true);
		const stored = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || "{}");
		expect(stored.gamma).toBe(true);
	});
});
