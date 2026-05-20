import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { SourceTree, TreeDocument } from "$lib/api";

// `+page.svelte` reads `page.params.name` from `$app/state`. jsdom has no
// SvelteKit runtime, so we provide a minimal stub.
vi.mock("$app/state", () => ({
	page: { params: { name: "demo-src" } },
}));

// The page fetches its data via fetchSourceTree (GET /api/sources/{name}/tree).
// Mock it so the component renders deterministic content without a backend.
const fetchSourceTree = vi.fn<(name: string) => Promise<SourceTree>>();
vi.mock("$lib/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("$lib/api")>();
	return {
		...actual,
		fetchSourceTree: (name: string) => fetchSourceTree(name),
	};
});

import Page from "./+page.svelte";

function doc(
	filePath: string,
	title: string | null = null,
	lineCount: number | null = null,
): TreeDocument {
	return {
		doc_id: `demo-src:${filePath}`,
		source: "demo-src",
		file_path: filePath,
		title: title ?? filePath,
		created_at: null,
		modified_at: null,
		size_bytes: null,
		line_count: lineCount,
	};
}

function groupTitles(container: HTMLElement): (string | undefined)[] {
	return Array.from(
		container.querySelectorAll<HTMLHeadingElement>(".doc-group__title"),
	).map((h) => h.textContent?.trim());
}

beforeEach(() => {
	fetchSourceTree.mockReset();
});

describe("source/[name] page", () => {
	it("renders one flat (non-indented) table group per directory, root files first", async () => {
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [
				doc("README.md", "README", 12),
				doc("guides/intro.md", "Intro", 40),
				doc("docs/archive/old.md", "Old", 7),
			],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		// (a) Each directory is its own flat group; nested folders become
		// sibling groups (e.g. "Documentation / Archive"), not indented
		// children. The literal `docs/` folder is relabelled to
		// "Documentation" via displayFolderName; sub-segments stay
		// Title-Cased via displaySource.
		const titles = groupTitles(container);
		expect(titles[0]).toBe("Root Documents"); // root files always first
		expect(titles).toContain("Guides");
		expect(titles).toContain("Documentation / Archive");

		// One <section.doc-group> + table per directory (root + 2 dirs).
		expect(container.querySelectorAll("section.doc-group").length).toBe(3);
		expect(container.querySelectorAll("table.doc-table").length).toBe(3);

		// (b) The root-level file still appears, linking to its doc.
		const readmeLink = container.querySelector<HTMLAnchorElement>(
			'.cell-title a[href="/doc/demo-src%3AREADME.md"]',
		);
		expect(readmeLink).not.toBeNull();

		// (c) Line count is rendered in the table's numeric column.
		const lineCells = Array.from(
			container.querySelectorAll<HTMLTableCellElement>("td.num"),
		).map((c) => c.textContent?.trim());
		expect(lineCells).toContain("40");
	});

	it("shows no Root Documents group when there are no root-level docs", async () => {
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [doc("guides/intro.md", "Intro")],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		const titles = groupTitles(container);
		expect(titles).not.toContain("Root Documents");
		expect(titles).toContain("Guides");
	});

	it("renders an em-dash when a doc has no line count", async () => {
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [doc("guides/intro.md", "Intro", null)],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		const lineCell = container.querySelector<HTMLTableCellElement>("td.num");
		expect(lineCell?.textContent?.trim()).toBe("—");
	});
});
