import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { TreeDocument } from "$lib/api";
import type { FolderNode } from "$lib/tree";
import { buildFolderTree } from "$lib/tree";
import { currentDocId } from "$lib/stores.svelte";
import TreeNode from "./TreeNode.svelte";

function doc(filePath: string, title: string | null = null): TreeDocument {
	return {
		doc_id: `src:${filePath}`,
		source: "src",
		file_path: filePath,
		title: title ?? filePath,
		created_at: null,
		modified_at: null,
		size_bytes: null,
	};
}

beforeEach(() => {
	currentDocId.value = null;
});

describe("TreeNode", () => {
	it("renders a leaf link for a root-level doc", () => {
		const root: FolderNode = buildFolderTree([doc("readme.md", "README")]);
		const { container } = render(TreeNode, { props: { node: root, depth: 0 } });
		const link = container.querySelector("a.tree-leaf");
		expect(link).not.toBeNull();
		expect(link?.getAttribute("href")).toBe("/doc/src%3Areadme.md");
	});

	it("renders a folder button with the segment name", () => {
		const root = buildFolderTree([doc("docs/intro.md")]);
		const { container } = render(TreeNode, { props: { node: root, depth: 0 } });
		const folderBtn = container.querySelector(".folder-toggle");
		expect(folderBtn?.textContent).toContain("docs");
	});

	it("auto-expands top two levels and collapses deeper folders", () => {
		const root = buildFolderTree([doc("a/b/c/leaf.md")]);
		const { container } = render(TreeNode, { props: { node: root, depth: 0 } });
		// All three folder toggles should be present; "a" and "b" auto-expanded
		// (depth 0 and 1), "c" collapsed.
		const toggles = container.querySelectorAll(".folder-toggle");
		expect(toggles.length).toBeGreaterThanOrEqual(2);
		const expandedStates = Array.from(toggles).map((t) =>
			t.getAttribute("aria-expanded"),
		);
		expect(expandedStates[0]).toBe("true"); // a
		expect(expandedStates[1]).toBe("true"); // b
		// c is at depth 2 — collapsed by default
		expect(expandedStates[2]).toBe("false");
	});

	it("toggles open/closed when the folder button is clicked", async () => {
		const root = buildFolderTree([doc("a/b/c/leaf.md")]);
		const { container } = render(TreeNode, { props: { node: root, depth: 0 } });
		const aToggle = container.querySelectorAll(".folder-toggle")[0] as HTMLButtonElement;
		expect(aToggle.getAttribute("aria-expanded")).toBe("true");
		await fireEvent.click(aToggle);
		expect(aToggle.getAttribute("aria-expanded")).toBe("false");
		await fireEvent.click(aToggle);
		expect(aToggle.getAttribute("aria-expanded")).toBe("true");
	});

	it("applies depth-based left padding to nested folders", () => {
		const root = buildFolderTree([doc("a/b/leaf.md")]);
		const { container } = render(TreeNode, { props: { node: root, depth: 0 } });
		// The outer .tree-folder has padding-left: 0 (depth=0 root).
		const folders = container.querySelectorAll<HTMLElement>(".tree-folder");
		expect(folders.length).toBeGreaterThanOrEqual(2);
		// Root (the wrapping FolderNode with empty name) has depth 0 → 0px.
		expect(folders[0].style.paddingLeft).toBe("0px");
		// Child folder "a" is rendered by a nested TreeNode at depth 0 still
		// (root has empty name, so depth doesn't increment for its children).
		// Its child "b" is at depth 1 → 12px.
		const paddings = Array.from(folders).map((f) => f.style.paddingLeft);
		expect(paddings).toContain("12px");
	});

	it("marks the active doc with the .active class", () => {
		currentDocId.value = "src:readme.md";
		const root = buildFolderTree([doc("readme.md"), doc("other.md")]);
		const { container } = render(TreeNode, { props: { node: root, depth: 0 } });
		const active = container.querySelector("a.tree-leaf.active");
		expect(active).not.toBeNull();
		expect(active?.getAttribute("href")).toBe("/doc/src%3Areadme.md");
		// The non-active leaf should not have the class.
		const all = container.querySelectorAll("a.tree-leaf");
		const nonActive = Array.from(all).filter((a) => !a.classList.contains("active"));
		expect(nonActive).toHaveLength(1);
	});

	it("force-expanded=true opens deep folders that would normally be collapsed", () => {
		const root = buildFolderTree([doc("a/b/c/leaf.md")]);
		const { container } = render(TreeNode, {
			props: { node: root, depth: 0, expanded: true },
		});
		const toggles = container.querySelectorAll(".folder-toggle");
		// With force-expanded, every folder including depth 2 ("c") should be open.
		Array.from(toggles).forEach((t) => {
			expect(t.getAttribute("aria-expanded")).toBe("true");
		});
	});

	it("force-expanded=false collapses everything", () => {
		const root = buildFolderTree([doc("a/b/leaf.md")]);
		const { container } = render(TreeNode, {
			props: { node: root, depth: 0, expanded: false },
		});
		const toggles = container.querySelectorAll(".folder-toggle");
		Array.from(toggles).forEach((t) => {
			expect(t.getAttribute("aria-expanded")).toBe("false");
		});
	});

	it("applies the sortDocs comparator to leaf order", () => {
		const root = buildFolderTree([
			doc("docs/aaa.md", "AAA"),
			doc("docs/bbb.md", "BBB"),
			doc("docs/ccc.md", "CCC"),
		]);
		// Reverse alphabetical sort
		const sortDocs = (docs: TreeDocument[]) =>
			[...docs].sort((a, b) => (b.title ?? "").localeCompare(a.title ?? ""));
		const { container } = render(TreeNode, {
			props: { node: root, depth: 0, sortDocs },
		});
		const links = container.querySelectorAll<HTMLAnchorElement>("a.tree-leaf");
		const order = Array.from(links).map((a) => a.textContent?.trim());
		expect(order).toEqual(["CCC", "BBB", "AAA"]);
	});
});
