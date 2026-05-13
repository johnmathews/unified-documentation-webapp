<script lang="ts">
	import { fetchAllSourcesTree, listBookmarks, type SourceTree, type TreeDocument } from "$lib/api";
	import { buildFolderTree, collectAllDocs, type FolderNode } from "$lib/tree";
	import { displaySource } from "$lib/titles";
	import {
		CATEGORY_FILTERS,
		categoryFilters,
		DOC_TYPES,
		sidebarCollapse,
		typeFilters,
	} from "$lib/stores.svelte";
	import TreeNode from "./TreeNode.svelte";

	let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

	let sources: SourceTree[] = $state([]);
	let loading = $state(true);
	let error = $state("");
	let bookmarkedDocIds: Set<string> = $state(new Set());
	let bookmarksFetched = $state(false);

	const bookmarksActive = $derived(categoryFilters.value.bookmarks === true);

	// Fetch bookmark IDs lazily — only when the bookmarks pill flips on.
	// Cached across toggles for the lifetime of the component.
	$effect(() => {
		if (!bookmarksActive || bookmarksFetched) return;
		bookmarksFetched = true;
		listBookmarks()
			.then((entries) => {
				bookmarkedDocIds = new Set(entries.map((b) => b.doc_id));
			})
			.catch(() => {
				/* leave the set empty — the pill simply hides everything,
				   which is a visible-but-recoverable failure mode. */
			});
	});

	function filterDoc(doc: TreeDocument): boolean {
		if (!typeFilters.isVisible(doc.type)) return false;
		if (!categoryFilters.anyActive) return true;
		if (bookmarksActive && bookmarkedDocIds.has(doc.doc_id)) return true;
		return categoryFilters.isVisible(doc.file_path);
	}

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
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to load";
		} finally {
			loading = false;
		}
	}

	function toggleSource(source: string) {
		sidebarCollapse.toggle(source);
	}

	function expandAll() {
		const updates: Record<string, boolean> = {};
		for (const s of sources) updates[s.source] = true;
		sidebarCollapse.setMany(updates);
		forceExpanded = true;
	}

	function collapseAll() {
		const updates: Record<string, boolean> = {};
		for (const s of sources) updates[s.source] = false;
		sidebarCollapse.setMany(updates);
		forceExpanded = false;
	}

	const allExpanded = $derived(
		sources.length > 0 && sources.every((s) => sidebarCollapse.isExpanded(s.source)),
	);
	const allCollapsed = $derived(
		sources.length > 0 && sources.every((s) => !sidebarCollapse.isExpanded(s.source)),
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

			<div class="type-filters" role="group" aria-label="Filter by type">
				{#each DOC_TYPES as t (t.key)}
					<button
						type="button"
						class="type-filter-chip type-filter-chip--{t.key}"
						class:active={typeFilters.value[t.key]}
						aria-pressed={typeFilters.value[t.key]}
						onclick={() => typeFilters.toggle(t.key)}
					>
						{t.label}
					</button>
				{/each}
			</div>

			<div class="type-filters category-filters" role="group" aria-label="Filter by category">
				{#each CATEGORY_FILTERS as c (c.key)}
					<button
						type="button"
						class="type-filter-chip category-filter-chip"
						class:active={categoryFilters.value[c.key]}
						aria-pressed={categoryFilters.value[c.key]}
						onclick={() => categoryFilters.toggle(c.key)}
					>
						{c.label}
					</button>
				{/each}
			</div>

			{#each sources as source (source.source)}
				<div class="tree-source">
					<button class="tree-toggle" onclick={() => toggleSource(source.source)}>
						<svg
							class="chevron"
							class:expanded={sidebarCollapse.isExpanded(source.source)}
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

					{#if sidebarCollapse.isExpanded(source.source) && trees[source.source]}
						<div class="source-tree-body">
							<TreeNode
								node={trees[source.source]}
								depth={0}
								expanded={forceExpanded}
								{onNavigate}
								{filterDoc}
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

	.type-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 6px 12px 8px;
	}

	.type-filter-chip {
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		padding: 4px 12px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--text-secondary) 35%, transparent);
		background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
		color: var(--text);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}

	.type-filter-chip:hover {
		background: color-mix(in srgb, var(--text-secondary) 18%, transparent);
	}

	/* Active states keep text at `var(--text)` for crisp contrast in both
	   themes; the tinted background is the visual indicator. */
	.type-filter-chip--documentation.active {
		color: var(--text);
		border-color: color-mix(in srgb, var(--accent) 60%, transparent);
		background: color-mix(in srgb, var(--accent) 22%, transparent);
	}

	.type-filter-chip--journal.active {
		color: var(--text);
		border-color: color-mix(in srgb, #5b8def 60%, transparent);
		background: color-mix(in srgb, #5b8def 24%, transparent);
	}

	.type-filter-chip--prompt.active {
		color: var(--text);
		border-color: color-mix(in srgb, #d4a017 60%, transparent);
		background: color-mix(in srgb, #d4a017 24%, transparent);
	}

	.type-filter-chip--not-docs.active {
		color: var(--text);
		border-color: color-mix(in srgb, var(--text-secondary) 70%, transparent);
		background: color-mix(in srgb, var(--text-secondary) 28%, transparent);
	}

	/* Second row: location categories share the chip shape but use a single
	   accent (brand blue) for the active state, so the row reads as a unified
	   secondary filter rather than competing with the doc-type colors above. */
	.category-filters {
		padding-top: 0;
	}

	.category-filter-chip.active {
		color: var(--text);
		border-color: color-mix(in srgb, var(--brand) 60%, transparent);
		background: color-mix(in srgb, var(--brand) 22%, transparent);
	}

	.tree-source {
		margin-bottom: 5px;
	}

	.tree-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		/* Left padding matches `.source-tree-body` + `.tree-folder`(depth 0)
		   so the source chevron aligns with first-level folder chevrons. */
		padding: 10px 15px 10px 8px;
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
