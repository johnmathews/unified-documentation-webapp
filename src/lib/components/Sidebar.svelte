<script lang="ts">
	import { fetchAllSourcesTree, type SourceTree } from "$lib/api";
	import { buildFolderTree, collectAllDocs, type FolderNode } from "$lib/tree";
	import { displaySource } from "$lib/titles";
	import TreeNode from "./TreeNode.svelte";

	let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

	let sources: SourceTree[] = $state([]);
	let loading = $state(true);
	let error = $state("");
	let expandedSources: Record<string, boolean> = $state({});

	// One-shot expand/collapse override. null = each TreeNode self-manages.
	let forceExpanded: boolean | null = $state(null);

	// Resets `forceExpanded` back to null so individual TreeNodes resume
	// per-folder control once the override has propagated.
	$effect(() => {
		if (forceExpanded !== null) {
			const pending = forceExpanded;
			queueMicrotask(() => {
				if (forceExpanded === pending) forceExpanded = null;
			});
		}
	});

	$effect(() => {
		loadTree();
	});

	async function loadTree() {
		try {
			const payload = await fetchAllSourcesTree();
			sources = payload.sources;
			// Expand the first source by default; collapse the rest. With many
			// sources, an all-expanded sidebar is overwhelming.
			for (const s of sources) {
				if (!(s.source in expandedSources)) {
					expandedSources[s.source] = sources.length === 1 || sources.indexOf(s) === 0;
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to load";
		} finally {
			loading = false;
		}
	}

	function toggleSource(source: string) {
		expandedSources[source] = !expandedSources[source];
	}

	function expandAll() {
		for (const s of sources) expandedSources[s.source] = true;
		forceExpanded = true;
	}

	function collapseAll() {
		for (const s of sources) expandedSources[s.source] = false;
		forceExpanded = false;
	}

	const allExpanded = $derived(
		sources.length > 0 && sources.every((s) => expandedSources[s.source]),
	);
	const allCollapsed = $derived(
		sources.length > 0 && sources.every((s) => !expandedSources[s.source]),
	);

	const trees: Record<string, FolderNode> = $derived.by(() => {
		const out: Record<string, FolderNode> = {};
		for (const s of sources) out[s.source] = buildFolderTree(s.files);
		return out;
	});

	function totalDocs(name: string): number {
		const root = trees[name];
		return root ? collectAllDocs(root).length : 0;
	}
</script>

<div class="sidebar-inner">
	{#if loading}
		<div class="loading-msg">Loading sources...</div>
	{:else if error}
		<div class="error-msg">{error}</div>
	{:else}
		<nav class="tree">
			<div class="tree-header">
				<span class="tree-header-label"></span>
				<div class="expand-collapse">
					{#if !allExpanded}
						<button class="tree-text-btn" onclick={expandAll}>expand all</button>
					{/if}
					{#if !allExpanded && !allCollapsed}
						<span class="tree-text-sep">|</span>
					{/if}
					{#if !allCollapsed}
						<button class="tree-text-btn" onclick={collapseAll}>collapse all</button>
					{/if}
				</div>
			</div>

			{#each sources as source (source.source)}
				<div class="tree-source">
					<button class="tree-toggle" onclick={() => toggleSource(source.source)}>
						<svg
							class="chevron"
							class:expanded={expandedSources[source.source]}
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<span class="source-tag">{displaySource(source.source)}</span>
						<span class="count">{totalDocs(source.source)}</span>
					</button>

					{#if expandedSources[source.source] && trees[source.source]}
						<div class="source-tree-body">
							<TreeNode
								node={trees[source.source]}
								depth={0}
								expanded={forceExpanded}
								{onNavigate}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</nav>
	{/if}
</div>

<style>
	.sidebar-inner {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-surface);
	}

	.tree-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 15px;
	}

	.tree-header-label {
		font-size: 16px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.expand-collapse {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.tree-text-btn {
		background: none;
		border: none;
		padding: 5px;
		font-size: 14px;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.15s;
		text-transform: lowercase;
	}

	.tree-text-btn:hover {
		color: var(--text);
	}

	.tree-text-sep {
		font-size: 14px;
		color: var(--text-muted);
		user-select: none;
	}

	.loading-msg,
	.error-msg {
		padding: 20px;
		color: var(--text-secondary);
		font-size: 16px;
		text-align: center;
	}

	.error-msg {
		color: var(--error);
	}

	.tree {
		flex: 1;
		overflow-y: auto;
		padding: 5px 0 10px;
	}

	.tree-source {
		margin-bottom: 5px;
	}

	.tree-toggle {
		display: flex;
		align-items: center;
		gap: 5px;
		width: 100%;
		padding: 10px 15px;
		background: none;
		border: none;
		color: var(--text);
		font-size: 16px;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
		border-radius: 0;
		transition: background 0.1s;
	}

	.tree-toggle:hover {
		background: var(--bg-hover);
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.15s;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.source-tag {
		font-size: 16px;
		font-weight: bold;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.count {
		font-size: 14px;
		color: var(--text-secondary);
		background: var(--bg-body);
		padding: 2px 8px;
		border-radius: 0;
		flex-shrink: 0;
	}

	.source-tree-body {
		padding-left: 8px;
	}

	@media (max-width: 768px) {
		.tree-toggle {
			padding: 15px;
			min-height: 44px;
			font-size: 16px;
		}
		.tree-text-btn {
			font-size: 14px;
			min-height: 44px;
			display: inline-flex;
			align-items: center;
		}
		.source-tag {
			font-size: 16px;
		}
		.count {
			font-size: 14px;
			padding: 2px 10px;
		}
		.tree-header-label {
			font-size: 16px;
		}
		.loading-msg,
		.error-msg {
			font-size: 16px;
		}
	}
</style>
