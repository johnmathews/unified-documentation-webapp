import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { AllSourcesTree } from "$lib/api";
import Sidebar from "./Sidebar.svelte";

function mockFetch(payload: AllSourcesTree) {
	global.fetch = vi.fn().mockImplementation((url: string) => {
		if (url === "/api/sources/tree") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(payload),
			} as Response);
		}
		return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
	}) as typeof fetch;
}

beforeEach(() => {
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

	it("renders the folder tree inside the first (auto-expanded) source", async () => {
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

	it("collapses additional sources by default (only the first is expanded)", async () => {
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

		const sourceBodies = container.querySelectorAll(".source-tree-body");
		// First source expanded → has a body; second collapsed → no body.
		expect(sourceBodies).toHaveLength(1);
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
		expect(container.querySelector(".source-tree-body")).not.toBeNull();

		await fireEvent.click(header);
		expect(container.querySelector(".source-tree-body")).toBeNull();

		await fireEvent.click(header);
		expect(container.querySelector(".source-tree-body")).not.toBeNull();
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
