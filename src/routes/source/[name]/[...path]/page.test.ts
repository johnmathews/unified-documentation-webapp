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

beforeEach(() => {
	fetchSourceTree.mockReset();
	params.name = "demo-src";
	params.path = "docs";
});

describe("source/[name]/[...path] folder-browse page", () => {
	it("renders the subtree's child folders as <h2> and a Files section", async () => {
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
			expect(container.querySelector(".concertina")).not.toBeNull();
		});

		const headings = Array.from(
			container.querySelectorAll<HTMLHeadingElement>(".concertina h2"),
		).map((h) => h.textContent?.trim());
		// Child folders of `docs/`.
		expect(headings).toContain("architecture");
		expect(headings).toContain("runbooks");
		// docs/intro.md is a direct doc of this folder -> Files section.
		expect(headings).toContain("Files");
		// README.md (root-level) is NOT part of the docs/ subtree.
		expect(headings).not.toContain("README.md");
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
		expect(container.querySelector(".concertina")).toBeNull();

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
			expect(container.querySelector(".concertina")).not.toBeNull();
		});

		const headings = Array.from(
			container.querySelectorAll<HTMLHeadingElement>(".concertina h2"),
		).map((h) => h.textContent?.trim());
		expect(headings).toContain("sub");
	});
});
