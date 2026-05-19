import { describe, it, expect } from "vitest";
import type { TreeDocument } from "$lib/api";
import { buildFolderTree, collectAllDocs, findFolderNode } from "$lib/tree";

function doc(filePath: string, title = ""): TreeDocument {
	return {
		doc_id: `src:${filePath}`,
		source: "src",
		file_path: filePath,
		title: title || filePath,
		created_at: null,
		modified_at: null,
		size_bytes: null,
	};
}

describe("buildFolderTree", () => {
	it("returns an empty root for no docs", () => {
		const root = buildFolderTree([]);
		expect(root).toEqual({ name: "", path: "", children: [], docs: [] });
	});

	it("places top-level files in root.docs, not in children", () => {
		const root = buildFolderTree([doc("readme.md"), doc("setup.md")]);
		expect(root.children).toEqual([]);
		expect(root.docs.map((d) => d.file_path)).toEqual(["readme.md", "setup.md"]);
	});

	it("nests a single-level directory", () => {
		const root = buildFolderTree([doc("docs/intro.md")]);
		expect(root.docs).toEqual([]);
		expect(root.children).toHaveLength(1);
		expect(root.children[0].name).toBe("docs");
		expect(root.children[0].path).toBe("docs");
		expect(root.children[0].docs.map((d) => d.file_path)).toEqual(["docs/intro.md"]);
	});

	it("nests deeply", () => {
		const root = buildFolderTree([doc("a/b/c/leaf.md")]);
		expect(root.children[0].name).toBe("a");
		expect(root.children[0].children[0].name).toBe("b");
		expect(root.children[0].children[0].children[0].name).toBe("c");
		expect(root.children[0].children[0].children[0].path).toBe("a/b/c");
		expect(root.children[0].children[0].children[0].docs).toHaveLength(1);
	});

	it("groups siblings under the same parent", () => {
		const root = buildFolderTree([
			doc("docs/one.md"),
			doc("docs/two.md"),
			doc("docs/sub/three.md"),
		]);
		expect(root.children).toHaveLength(1);
		const docsNode = root.children[0];
		expect(docsNode.docs.map((d) => d.file_path)).toEqual(["docs/one.md", "docs/two.md"]);
		expect(docsNode.children).toHaveLength(1);
		expect(docsNode.children[0].name).toBe("sub");
	});

	it("mixes root-level and nested docs", () => {
		const root = buildFolderTree([
			doc("readme.md"),
			doc("docs/intro.md"),
			doc("journal/240101.md"),
		]);
		expect(root.docs.map((d) => d.file_path)).toEqual(["readme.md"]);
		expect(root.children.map((c) => c.name)).toEqual(["docs", "journal"]);
	});

	it("sorts children alphabetically", () => {
		const root = buildFolderTree([
			doc("zeta/a.md"),
			doc("alpha/a.md"),
			doc("middle/a.md"),
		]);
		expect(root.children.map((c) => c.name)).toEqual(["alpha", "middle", "zeta"]);
	});
});

describe("findFolderNode", () => {
	it("returns the root for an empty path", () => {
		const root = buildFolderTree([doc("docs/intro.md")]);
		expect(findFolderNode(root, "")).toBe(root);
	});

	it("returns the root for a path of only slashes", () => {
		const root = buildFolderTree([doc("docs/intro.md")]);
		expect(findFolderNode(root, "//")).toBe(root);
	});

	it("descends to a nested folder node", () => {
		const root = buildFolderTree([
			doc("docs/architecture/overview.md"),
			doc("docs/intro.md"),
		]);
		const node = findFolderNode(root, "docs/architecture");
		expect(node).not.toBeNull();
		expect(node?.name).toBe("architecture");
		expect(node?.path).toBe("docs/architecture");
		expect(node?.docs.map((d) => d.file_path)).toEqual([
			"docs/architecture/overview.md",
		]);
	});

	it("returns a single-level folder node", () => {
		const root = buildFolderTree([doc("docs/intro.md")]);
		const node = findFolderNode(root, "docs");
		expect(node?.name).toBe("docs");
	});

	it("returns null when any segment is missing", () => {
		const root = buildFolderTree([doc("docs/intro.md")]);
		expect(findFolderNode(root, "docs/nope")).toBeNull();
		expect(findFolderNode(root, "missing")).toBeNull();
		expect(findFolderNode(root, "docs/intro.md")).toBeNull();
	});
});

describe("collectAllDocs", () => {
	it("returns empty for an empty tree", () => {
		expect(collectAllDocs(buildFolderTree([]))).toEqual([]);
	});

	it("collects docs across nested folders", () => {
		const root = buildFolderTree([
			doc("readme.md"),
			doc("docs/one.md"),
			doc("docs/sub/two.md"),
			doc("journal/240101.md"),
		]);
		const paths = collectAllDocs(root).map((d) => d.file_path).sort();
		expect(paths).toEqual([
			"docs/one.md",
			"docs/sub/two.md",
			"journal/240101.md",
			"readme.md",
		]);
	});
});
