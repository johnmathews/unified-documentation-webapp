<script lang="ts">
	import { page } from "$app/state";
	import { fetchSourceTree, type SourceTree, type TreeDocument } from "$lib/api";
	import { buildFolderTree, collectAllDocs, type FolderNode } from "$lib/tree";
	import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
	import TreeNode from "$lib/components/TreeNode.svelte";
	import { currentDocId, currentPageContext, DOC_TYPES, typeFilters } from "$lib/stores.svelte";
	import { displayTitle, displaySource } from "$lib/titles";

	let source = $state<SourceTree | null>(null);
	let loading = $state(true);
	let error = $state("");

	type SortMode = "date" | "alpha";
	let sortMode: SortMode = $state("date");

	let sourceName = $derived(decodeURIComponent(page.params.name ?? ""));

	$effect(() => {
		currentDocId.value = null;
		currentPageContext.value = { source: sourceName };
		loadSource(sourceName);

		return () => {
			if (currentPageContext.value?.source === sourceName) {
				currentPageContext.value = null;
			}
		};
	});

	async function loadSource(name: string) {
		loading = true;
		error = "";
		try {
			source = await fetchSourceTree(name);
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to load";
		} finally {
			loading = false;
		}
	}

	const rootNode = $derived<FolderNode | null>(
		source ? buildFolderTree(source.files) : null,
	);

	const totalDocs = $derived(rootNode ? collectAllDocs(rootNode).length : 0);

	function sortDocs(docs: TreeDocument[]): TreeDocument[] {
		const copy = [...docs];
		if (sortMode === "alpha") {
			copy.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
		} else {
			copy.sort((a, b) => {
				const da = a.modified_at ?? a.created_at ?? "";
				const db = b.modified_at ?? b.created_at ?? "";
				return db.localeCompare(da);
			});
		}
		return copy;
	}
</script>

<svelte:head>
	<title>{displaySource(sourceName)} - Documentation Library</title>
</svelte:head>

{#if loading}
	<div class="status"><p>Loading...</p></div>
{:else if error}
	<div class="status">
		<p class="error">{error}</p>
		<a href="/">Back to home</a>
	</div>
{:else if source && rootNode}
	<div class="source-page">
		<Breadcrumbs source={source.source} />
		<h1>{displaySource(source.source)}</h1>
		<div class="controls-row">
			<div class="stats">
				<span class="stat-tag">{totalDocs} docs</span>
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
			<div class="sort-toggle">
				<button class:active={sortMode === "date"} onclick={() => (sortMode = "date")}
					>Recent</button
				>
				<button class:active={sortMode === "alpha"} onclick={() => (sortMode = "alpha")}
					>A–Z</button
				>
			</div>
		</div>

		<div class="tree-container">
			<TreeNode node={rootNode} depth={0} expanded={true} {sortDocs} />
		</div>
	</div>
{/if}

<style>
	.source-page {
		max-width: 960px;
		margin: 0 auto;
	}
	.status {
		padding: 60px;
		text-align: center;
		color: var(--text-secondary);
	}
	.error {
		color: var(--error);
	}
	h1 {
		font-size: 48px;
		font-weight: 700;
		margin-bottom: 5px;
	}
	.controls-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30px;
		gap: 12px;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.stat-tag {
		display: inline-block;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.01em;
		padding: 2px 8px;
		text-transform: uppercase;
		background: var(--stat-tag-bg, rgba(128, 128, 128, 0.15));
		color: var(--text-secondary);
	}

	.type-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
		justify-content: center;
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

	.sort-toggle {
		display: flex;
		border: 1px solid var(--border);
		border-radius: 3px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.sort-toggle button {
		padding: 4px 12px;
		font-size: 14px;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.sort-toggle button:first-child {
		border-right: 1px solid var(--border);
	}

	.sort-toggle button.active {
		background: var(--brand);
		color: #fff;
	}

	.sort-toggle button:hover:not(.active) {
		background: var(--stat-tag-bg, rgba(128, 128, 128, 0.15));
	}

	.tree-container {
		padding: 0;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 32px;
		}
		.stat-tag {
			font-size: 13px;
		}
		.controls-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
