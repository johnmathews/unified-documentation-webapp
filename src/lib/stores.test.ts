import { describe, it, expect, beforeEach } from "vitest";
import {
	DOC_TYPES,
	excludeNotDocs,
	sidebarCollapse,
} from "$lib/stores.svelte";

const EXCLUDE_KEY = "exclude-not-docs";
const SIDEBAR_KEY = "sidebar-expanded-sources";

function resetSidebarCollapse() {
	for (const key of Object.keys(sidebarCollapse.value)) {
		sidebarCollapse.set(key, false);
	}
}

describe("DOC_TYPES", () => {
	it("lists the document type vocabulary in order", () => {
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
