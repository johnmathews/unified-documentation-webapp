import type { TreeDocument } from "./api";

export interface FolderNode {
	name: string;
	path: string;
	children: FolderNode[];
	docs: TreeDocument[];
}

export function buildFolderTree(docs: TreeDocument[]): FolderNode {
	const root: FolderNode = { name: "", path: "", children: [], docs: [] };

	for (const doc of docs) {
		const segments = doc.file_path.split("/").filter(Boolean);
		if (segments.length === 0) continue;

		let current = root;
		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i];
			const childPath = current.path ? `${current.path}/${segment}` : segment;
			let child = current.children.find((c) => c.name === segment);
			if (!child) {
				child = { name: segment, path: childPath, children: [], docs: [] };
				current.children.push(child);
			}
			current = child;
		}
		current.docs.push(doc);
	}

	sortNode(root);
	return root;
}

function sortNode(node: FolderNode): void {
	node.children.sort((a, b) => a.name.localeCompare(b.name));
	node.docs.sort((a, b) => (a.file_path).localeCompare(b.file_path));
	for (const child of node.children) sortNode(child);
}

export function collectAllDocs(node: FolderNode): TreeDocument[] {
	const out: TreeDocument[] = [...node.docs];
	for (const child of node.children) {
		out.push(...collectAllDocs(child));
	}
	return out;
}
