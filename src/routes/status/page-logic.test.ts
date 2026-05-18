import { describe, it, expect } from "vitest";
import {
	parseSortParams,
	buildSortQuery,
	POLL_INTERVAL_MS,
	SORT_KEYS,
	DEFAULT_SORT,
} from "./page-logic";

describe("parseSortParams", () => {
	it("returns defaults when no params are present", () => {
		const params = new URLSearchParams("");
		expect(parseSortParams(params)).toEqual(DEFAULT_SORT);
	});

	it("parses a valid sort key + asc direction", () => {
		const params = new URLSearchParams("sort=source&dir=asc");
		expect(parseSortParams(params)).toEqual({ key: "source", asc: true });
	});

	it("parses a valid sort key + desc direction", () => {
		const params = new URLSearchParams("sort=file_count&dir=desc");
		expect(parseSortParams(params)).toEqual({ key: "file_count", asc: false });
	});

	it("falls back to defaults when sort key is unknown", () => {
		const params = new URLSearchParams("sort=evil&dir=asc");
		expect(parseSortParams(params)).toEqual(DEFAULT_SORT);
	});

	it("falls back to default dir when dir is unknown but key is valid", () => {
		const params = new URLSearchParams("sort=source&dir=sideways");
		expect(parseSortParams(params)).toEqual({ key: "source", asc: true });
	});

	it("treats dir as desc-by-default when missing on a non-text column", () => {
		const params = new URLSearchParams("sort=file_count");
		expect(parseSortParams(params)).toEqual({ key: "file_count", asc: false });
	});

	it("treats dir as asc-by-default when missing on a text column", () => {
		const params = new URLSearchParams("sort=source");
		expect(parseSortParams(params)).toEqual({ key: "source", asc: true });
	});
});

describe("buildSortQuery", () => {
	it("returns empty string when sort matches default", () => {
		expect(buildSortQuery(DEFAULT_SORT)).toBe("");
	});

	it("includes sort and dir when both differ from defaults", () => {
		expect(buildSortQuery({ key: "source", asc: false })).toBe(
			"?sort=source&dir=desc"
		);
	});

	it("includes sort when only key differs", () => {
		expect(buildSortQuery({ key: "file_count", asc: false })).toBe(
			"?sort=file_count"
		);
	});

	it("includes both sort and dir when key matches default but dir differs", () => {
		// DEFAULT_SORT is { key: "last_indexed", asc: false }. Flipping direction
		// alone must still emit the key — direction alone can't identify the sort.
		// Locks the URL shape against a refactor of DEFAULT_SORT that might drop
		// the redundant key.
		expect(buildSortQuery({ key: "last_indexed", asc: true })).toBe(
			"?sort=last_indexed&dir=asc"
		);
	});
});

describe("SORT_KEYS", () => {
	it("matches the route's known sort keys", () => {
		expect(SORT_KEYS).toEqual([
			"source",
			"source_status",
			"file_count",
			"chunk_count",
			"last_indexed",
			"last_checked",
		]);
	});
});

describe("POLL_INTERVAL_MS", () => {
	it("is 30 seconds", () => {
		expect(POLL_INTERVAL_MS).toBe(30_000);
	});
});
