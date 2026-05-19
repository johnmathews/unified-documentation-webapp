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
});

describe("source/[name] page", () => {
	it("renders each top-level directory as an <h2> in the concertina, and keeps a root-level file", async () => {
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [
				doc("README.md", "README"),
				doc("guides/intro.md", "Intro"),
				doc("reference/api.md", "API"),
			],
		});

		const { container, findByText } = render(Page);

		// Wait for the async load to resolve and the concertina to render.
		await waitFor(() => {
			expect(container.querySelector(".concertina")).not.toBeNull();
		});

		// (a) Top-level directories render as <h2> elements inside the concertina.
		const headings = Array.from(
			container.querySelectorAll<HTMLHeadingElement>(".concertina h2"),
		).map((h) => h.textContent?.trim());
		expect(headings).toContain("guides");
		expect(headings).toContain("reference");

		// Each directory heading lives inside its own <details> section.
		const sections = container.querySelectorAll("details.section");
		// Files section + 2 folder sections.
		expect(sections.length).toBe(3);

		// (b) The root-level file (README.md) still appears. Root-level docs
		// render via displayTitle, which uses the bare filename.
		const readme = await findByText("README.md");
		expect(readme).toBeInTheDocument();
		const readmeLink = readme.closest("a");
		expect(readmeLink?.getAttribute("href")).toBe("/doc/demo-src%3AREADME.md");
	});

	it("shows no Files section when there are no root-level docs", async () => {
		fetchSourceTree.mockResolvedValue({
			source: "demo-src",
			files: [doc("guides/intro.md", "Intro")],
		});

		const { container } = render(Page);

		await waitFor(() => {
			expect(container.querySelector(".concertina")).not.toBeNull();
		});

		const headings = Array.from(
			container.querySelectorAll<HTMLHeadingElement>(".concertina h2"),
		).map((h) => h.textContent?.trim());
		expect(headings).not.toContain("Files");
		expect(headings).toContain("guides");
	});
});
