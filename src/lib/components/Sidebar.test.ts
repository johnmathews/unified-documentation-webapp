import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { AllSourcesTree, BookmarkEntry } from "$lib/api";
import { sidebarCollapse, categoryFilters, CATEGORY_FILTERS } from "$lib/stores.svelte";
import Sidebar from "./Sidebar.svelte";

function mockFetch(payload: AllSourcesTree, bookmarks: BookmarkEntry[] = []) {
	global.fetch = vi.fn().mockImplementation((url: string) => {
		if (url === "/api/sources/tree") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(payload),
			} as Response);
		}
		if (url === "/api/bookmarks") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(bookmarks),
			} as Response);
		}
		return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
	}) as typeof fetch;
}

function resetStoreState() {
	// Clear any persisted source-expansion state from prior tests.
	for (const key of Object.keys(sidebarCollapse.value)) {
		sidebarCollapse.set(key, false);
	}
	// Reset every category pill to off.
	for (const c of CATEGORY_FILTERS) {
		if (categoryFilters.value[c.key]) categoryFilters.toggle(c.key);
	}
}

beforeEach(() => {
	localStorage.clear();
	resetStoreState();
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("Sidebar", () => {
	it("renders one collapsible source entry per configured source", async () => {
		mockFetch({
			sources: [
				{
					source: "pi-harness",
					files: [
						{
							doc_id: "pi-harness:README.md",
							source: "pi-harness",
							file_path: "README.md",
							title: "README",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
					],
				},
				{ source: "tech-blog", files: [] },
			],
		});

		const { container } = render(Sidebar);

		await waitFor(() => {
			const headers = container.querySelectorAll(".tree-toggle .source-tag");
			expect(headers).toHaveLength(2);
		});

		const headers = container.querySelectorAll(".tree-toggle .source-tag");
		expect(headers[0].textContent).toBe("Pi Harness");
		expect(headers[1].textContent).toBe("Tech Blog");
	});

	it("shows the file count badge per source", async () => {
		mockFetch({
			sources: [
				{
					source: "pi-harness",
					files: [
						{
							doc_id: "pi-harness:a.md",
							source: "pi-harness",
							file_path: "a.md",
							title: "A",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
						{
							doc_id: "pi-harness:b.md",
							source: "pi-harness",
							file_path: "b.md",
							title: "B",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
					],
				},
			],
		});

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelector(".tree-toggle .count")).not.toBeNull();
		});

		const count = container.querySelector(".tree-toggle .count");
		expect(count?.textContent?.trim()).toBe("2");
	});

	it("renders the folder tree inside an expanded source", async () => {
		mockFetch({
			sources: [
				{
					source: "pi-harness",
					files: [
						{
							doc_id: "pi-harness:journal/240101.md",
							source: "pi-harness",
							file_path: "journal/240101.md",
							title: "First entry",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
						{
							doc_id: "pi-harness:README.md",
							source: "pi-harness",
							file_path: "README.md",
							title: "README",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
					],
				},
			],
		});
		// Sources start collapsed; expand one explicitly so the tree renders.
		sidebarCollapse.set("pi-harness", true);

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelector(".source-tree-body")).not.toBeNull();
		});

		// Folder "journal" is rendered as a folder-toggle inside the tree.
		const folderToggle = container.querySelector(".source-tree-body .folder-toggle");
		expect(folderToggle?.textContent).toContain("journal");

		// README.md is rendered as a leaf link.
		const links = container.querySelectorAll(".source-tree-body a.tree-leaf");
		const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
		expect(hrefs).toContain("/doc/pi-harness%3AREADME.md");
	});

	it("collapses every source by default", async () => {
		mockFetch({
			sources: [
				{ source: "first", files: [] },
				{ source: "second", files: [] },
			],
		});

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelectorAll(".tree-source")).toHaveLength(2);
		});

		expect(container.querySelectorAll(".source-tree-body")).toHaveLength(0);
	});

	it("toggles a source body when its header is clicked", async () => {
		mockFetch({
			sources: [{ source: "only", files: [] }],
		});

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelector(".tree-source")).not.toBeNull();
		});

		const header = container.querySelector(".tree-source .tree-toggle") as HTMLButtonElement;
		// Starts collapsed.
		expect(container.querySelector(".source-tree-body")).toBeNull();

		await fireEvent.click(header);
		expect(container.querySelector(".source-tree-body")).not.toBeNull();

		await fireEvent.click(header);
		expect(container.querySelector(".source-tree-body")).toBeNull();
	});

	it("restores expansion state from the persisted store on mount", async () => {
		mockFetch({
			sources: [
				{ source: "alpha", files: [] },
				{ source: "beta", files: [] },
			],
		});
		// Seed the store as if a prior session expanded "beta" but not "alpha".
		sidebarCollapse.set("beta", true);

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelectorAll(".tree-source")).toHaveLength(2);
		});

		// Exactly one body (beta), and it appears under the second source row.
		const rows = container.querySelectorAll(".tree-source");
		expect(rows[0].querySelector(".source-tree-body")).toBeNull();
		expect(rows[1].querySelector(".source-tree-body")).not.toBeNull();
	});

	it("renders the category-filter row alongside the doc-type row", async () => {
		mockFetch({ sources: [{ source: "x", files: [] }] });
		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelector(".tree-source")).not.toBeNull();
		});

		const rows = container.querySelectorAll('[role="group"]');
		const labels = Array.from(rows).map((r) => r.getAttribute("aria-label"));
		expect(labels).toEqual(expect.arrayContaining(["Filter by type", "Filter by category"]));

		// All five category pills are rendered, regardless of active state.
		const categoryChips = container.querySelectorAll(".category-filter-chip");
		expect(categoryChips).toHaveLength(CATEGORY_FILTERS.length);
	});

	it("filters the tree by location category when a category pill is on", async () => {
		mockFetch({
			sources: [
				{
					source: "repo",
					files: [
						{
							doc_id: "repo:.engineering-team/eval.md",
							source: "repo",
							file_path: ".engineering-team/eval.md",
							title: "Eval",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
						{
							doc_id: "repo:journal/250101.md",
							source: "repo",
							file_path: "journal/250101.md",
							title: "Journal entry",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
						{
							doc_id: "repo:README.md",
							source: "repo",
							file_path: "README.md",
							title: "README",
							created_at: null,
							modified_at: null,
							size_bytes: null,
						},
					],
				},
			],
		});
		sidebarCollapse.set("repo", true);
		categoryFilters.toggle("engineering-team");

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelector(".source-tree-body")).not.toBeNull();
		});

		// Subfolders default to collapsed. Click each folder toggle so nested
		// leaves render — folder UX isn't the unit under test here.
		async function expandAllFolders() {
			let didOpen = true;
			while (didOpen) {
				didOpen = false;
				const closed = Array.from(
					container.querySelectorAll(".folder-toggle"),
				).filter((b) => b.getAttribute("aria-expanded") === "false") as HTMLButtonElement[];
				for (const b of closed) {
					await fireEvent.click(b);
					didOpen = true;
				}
			}
		}
		await expandAllFolders();

		const hrefs = Array.from(
			container.querySelectorAll(".source-tree-body a.tree-leaf"),
		).map((a) => a.getAttribute("href"));
		expect(hrefs).toEqual(["/doc/repo%3A.engineering-team%2Feval.md"]);
	});

	it("keeps bookmarked docs visible when the bookmarks pill is on", async () => {
		mockFetch(
			{
				sources: [
					{
						source: "repo",
						files: [
							{
								doc_id: "repo:journal/x.md",
								source: "repo",
								file_path: "journal/x.md",
								title: "X",
								created_at: null,
								modified_at: null,
								size_bytes: null,
							},
							{
								doc_id: "repo:docs/y.md",
								source: "repo",
								file_path: "docs/y.md",
								title: "Y",
								created_at: null,
								modified_at: null,
								size_bytes: null,
							},
						],
					},
				],
			},
			[
				{
					doc_id: "repo:docs/y.md",
					user_id: "test-user",
					bookmarked_at: "2026-01-01T00:00:00Z",
					title: "Y",
					source: "repo",
					file_path: "docs/y.md",
					created_at: null,
					modified_at: null,
					size_bytes: null,
				},
			],
		);
		sidebarCollapse.set("repo", true);
		categoryFilters.toggle("bookmarks");

		const { container } = render(Sidebar);

		await waitFor(() => {
			expect(container.querySelector(".source-tree-body")).not.toBeNull();
		});

		// Click each folder toggle so nested leaves render.
		async function expandAllFolders() {
			let didOpen = true;
			while (didOpen) {
				didOpen = false;
				const closed = Array.from(
					container.querySelectorAll(".folder-toggle"),
				).filter((b) => b.getAttribute("aria-expanded") === "false") as HTMLButtonElement[];
				for (const b of closed) {
					await fireEvent.click(b);
					didOpen = true;
				}
			}
		}
		await expandAllFolders();

		// Wait for the bookmarks fetch + filter recomputation to settle.
		await waitFor(() => {
			const hrefs = Array.from(
				container.querySelectorAll(".source-tree-body a.tree-leaf"),
			).map((a) => a.getAttribute("href"));
			expect(hrefs).toContain("/doc/repo%3Adocs%2Fy.md");
		});

		const hrefs = Array.from(
			container.querySelectorAll(".source-tree-body a.tree-leaf"),
		).map((a) => a.getAttribute("href"));
		// Bookmarked doc visible; non-bookmarked journal doc hidden (no other
		// category pill is on, so location filter would normally hide both).
		expect(hrefs).toContain("/doc/repo%3Adocs%2Fy.md");
		expect(hrefs).not.toContain("/doc/repo%3Ajournal%2Fx.md");
	});

	it("no longer renders the legacy 'Filter categories' panel", async () => {
		mockFetch({ sources: [{ source: "x", files: [] }] });
		const { container } = render(Sidebar);
		await waitFor(() => {
			expect(container.querySelector(".tree-source")).not.toBeNull();
		});
		expect(container.querySelector(".filter-section")).toBeNull();
		expect(container.querySelector(".filter-checkboxes")).toBeNull();
	});
});
