<script lang="ts">
	import type { FolderNode } from "$lib/tree";
	import type { TreeDocument } from "$lib/api";
	import { displayTitle } from "$lib/titles";
	import { currentDocId } from "$lib/stores.svelte";
	import TreeNode from "./TreeNode.svelte";

	type Props = {
		node: FolderNode;
		depth: number;
		expanded?: boolean | null;
		sortDocs?: (docs: TreeDocument[]) => TreeDocument[];
		onNavigate?: () => void;
	};

	let {
		node,
		depth,
		expanded = null,
		sortDocs,
		onNavigate = () => {},
	}: Props = $props();

	const sortedDocs = $derived(sortDocs ? sortDocs(node.docs) : node.docs);

	// Start every folder collapsed by default. The parent can override via the
	// `expanded` prop (Sidebar's expand-all / collapse-all controls), and the
	// user can toggle individual folders by clicking them.
	let localOpen = $state(false);

	// When the parent forces expanded/collapsed (e.g. via expand-all),
	// sync to it. After that, the user can resume per-folder control via click.
	$effect(() => {
		if (expanded !== null) localOpen = expanded;
	});

	function toggle() {
		localOpen = !localOpen;
	}

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}

	function isActive(docId: string): boolean {
		return currentDocId.value === docId;
	}

	const indentPx = $derived(depth * 12);
</script>

<div class="tree-folder" style:padding-left="{indentPx}px">
	{#if node.name !== ""}
		<button class="folder-toggle" onclick={toggle} aria-expanded={localOpen}>
			<svg
				class="chevron"
				class:expanded={localOpen}
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
			</svg>
			<span class="folder-name">{node.name}</span>
			<span class="count">{node.docs.length + node.children.length}</span>
		</button>
	{/if}

	{#if localOpen || node.name === ""}
		<div class="children">
			{#each node.children as child (child.path)}
				<TreeNode
					node={child}
					depth={node.name === "" ? depth : depth + 1}
					{expanded}
					{sortDocs}
					{onNavigate}
				/>
			{/each}

			{#each sortedDocs as doc (doc.doc_id)}
				<a
					href={docUrl(doc.doc_id)}
					class="tree-leaf"
					class:active={isActive(doc.doc_id)}
					onclick={onNavigate}
					style:padding-left="{(node.name === "" ? depth : depth + 1) * 12 + 14}px"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
					<span class="leaf-title">{displayTitle(doc)}</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tree-folder {
		display: block;
	}

	.folder-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 4px 8px 4px 0;
		background: none;
		border: none;
		color: var(--text);
		font-size: 14px;
		text-align: left;
		cursor: pointer;
	}

	.folder-toggle:hover {
		background: var(--bg-hover);
	}

	.folder-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.1s;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.count {
		font-size: 11px;
		color: var(--text-secondary);
		margin-left: 4px;
	}

	.tree-leaf {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 8px 3px 0;
		color: var(--text);
		font-size: 13px;
		text-decoration: none;
	}

	.tree-leaf:hover {
		background: var(--bg-hover);
	}

	.tree-leaf.active {
		background: var(--accent-dim);
		color: var(--accent);
	}

	.leaf-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
