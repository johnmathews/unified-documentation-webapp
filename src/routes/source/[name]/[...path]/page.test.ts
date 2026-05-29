import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { SourceTree, TreeDocument } from "$lib/api";

// `+page.svelte` reads `page.params.{name,path}` from `$app/state`. jsdom has
// no SvelteKit runtime, so we provide a minimal mutable stub.
const params = { name: "demo-src", path: "docs" };
vi.mock("$app/state", () => ({
	get page() {
		return { params };
	},
}));

const fetchSourceTree = vi.fn<(name: string) => Promise<SourceTree>>();
vi.mock("$lib/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("$lib/api")>();
	return {
		...actual,
		fetchSourceTree: (name: string) => fetchSourceTree(name),
	};
});

import Page from "./+page.svelte";

function doc(filePath: string, title: string | null = null): TreeDocument {
	return {
		doc_id: `demo-src:${filePath}`,
		source: "demo-src",
		file_path: filePath,
		title: title ?? filePath,
		created_at: null,
		modified_at: null,
		size_bytes: null,
	};
}

function groupTitles(container: HTMLElement): (string | undefined)[] {
	return Array.from(
		container.querySelectorAll<HTMLHeadingElement>(".doc-group__title"),
	).map((h) => h.textContent?.trim());
}

beforeEach(() => {
	fetchSourceTree.mockReset();
	params.name = "demo-src";
	params.path = "docs";
});

describe("source/[name]/[...path] folder-browse page", () => {
	it("renders one flat table group per descendant directory plus a Files group for the current folder", async () => {
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [
				doc("README.md", "README"),
				doc("docs/intro.md", "Intro"),
				doc("docs/architecture/overview.md", "Overview"),
				doc("docs/runbooks/oncall.md", "Oncall"),
			],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		const titles = groupTitles(container);
		expect(titles[0]).toBe("Files"); // current folder's own docs first
		expect(titles).toContain("Architecture");
		expect(titles).toContain("Runbooks");
		// README.md (root-level) is NOT part of the docs/ subtree.
		expect(titles).not.toContain("README.md");

		// Three groups → three tables.
		expect(container.querySelectorAll("section.doc-group").length).toBe(3);
		expect(container.querySelectorAll("table.doc-table").length).toBe(3);
	});

	it("renders the masthead caption with the parent-folder chain", async () => {
		params.path = "docs/proposals";
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [doc("docs/proposals/run-detail-layout.md", "Layout")],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		const caption = container.querySelector(".masthead__caption");
		expect(caption?.textContent?.trim()).toBe("Demo Src › Documentation");

		const h1 = container.querySelector(".masthead__title");
		expect(h1?.textContent?.trim()).toBe("Proposals");
	});

	it("shows a Folder not found state for a bogus path", async () => {
		params.path = "does/not/exist";
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [doc("docs/intro.md", "Intro")],
		});

		const { container, findByText } = render(Page);

		const notFound = await findByText("Folder not found");
		expect(notFound).toBeInTheDocument();
		expect(container.querySelector(".doc-table")).toBeNull();

		const back = container.querySelector("a[href='/source/demo-src']");
		expect(back).not.toBeNull();
	});

	it("decodes encoded path segments before descending", async () => {
		params.path = encodeURIComponent("my docs");
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [doc("my docs/sub/leaf.md", "Leaf")],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		const titles = groupTitles(container);
		expect(titles).toContain("Sub");
	});

	it("renders Modified / Created columns and the basename in the Filename column", async () => {
		params.path = "docs";
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [
				{
					doc_id: "demo-src:docs/intro.md",
					source: "demo-src",
					file_path: "docs/intro.md",
					title: "Intro",
					created_at: "2026-01-01T00:00:00Z",
					modified_at: "2026-05-01T00:00:00Z",
					size_bytes: null,
					line_count: 12,
				} satisfies TreeDocument,
			],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".doc-table")).not.toBeNull();
		});

		// Header order: Title | Filename | Modified | Created | Lines.
		const headers = Array.from(
			container.querySelectorAll<HTMLTableCellElement>("table.doc-table th"),
		).map((th) => th.textContent?.trim());
		expect(headers).toEqual(["Title", "Filename", "Modified", "Created", "Lines"]);

		// Filename column shows the basename, not the full repo path.
		const cellPath = container.querySelector(".cell-path");
		expect(cellPath?.textContent?.trim()).toBe("intro.md");
	});
});
