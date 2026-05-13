import { describe, it, expect, beforeEach } from "vitest";
import { DOC_TYPES, typeFilters, excludeNotDocs } from "$lib/stores.svelte";

const TYPE_KEY = "doc-type-filters";
const EXCLUDE_KEY = "exclude-not-docs";

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
