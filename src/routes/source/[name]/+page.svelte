<script lang="ts">
	import { page } from "$app/state";
	import { fetchSourceTree, type SourceTree, type TreeDocument } from "$lib/api";
	import { buildFolderTree, collectAllDocs, type FolderNode } from "$lib/tree";
	import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
	import TreeNode from "$lib/components/TreeNode.svelte";
	import { currentDocId, currentPageContext } from "$lib/stores.svelte";
	import { displayTitle, displaySource } from "$lib/titles";

	let source = $state<SourceTree | null>(null);
	let loading = $state(true);
	let error = $state("");

	type SortMode = "date" | "alpha";
	let sortMode: SortMode = $state("date");

	// One-shot expand/collapse override for the nested TreeNode folders.
	// null = each TreeNode self-manages (collapsed by default). Mirrors
	// Sidebar.svelte's pattern. The top-level concertina <details> elements
	// are driven separately by `sectionOpen` (see below).
	let forceExpanded: boolean | null = $state(null);

	$effect(() => {
		if (forceExpanded !== null) {
			const pending = forceExpanded;
			queueMicrotask(() => {
				if (forceExpanded === pending) forceExpanded = null;
			});
		}
	});

	// Per-section open state for the top-level concertina. Index 0 is the
	// root "Files" section (docs directly at the source root); indices
	// 1..N map to rootNode.children[i-1]. All sections start open.
	let sectionOpen = $state<boolean[]>([]);

	function syncSectionOpen() {
		const count = rootNode ? rootNode.children.length + 1 : 0;
		sectionOpen = Array.from({ length: count }, () => true);
	}

	function expandAll() {
		sectionOpen = sectionOpen.map(() => true);
		forceExpanded = true;
	}

	function collapseAll() {
		sectionOpen = sectionOpen.map(() => false);
		forceExpanded = false;
	}

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
	const folderCount = $derived(rootNode ? rootNode.children.length : 0);
	const rootDocs = $derived(rootNode ? rootNode.docs : []);

	// Keep the concertina open-state array sized to the current tree.
	$effect(() => {
		// reference rootNode so this re-runs when the tree changes
		void rootNode;
		syncSectionOpen();
	});

	const summaryLine = $derived(
		`${totalDocs} ${totalDocs === 1 ? "document" : "documents"} in ` +
			`${folderCount} ${folderCount === 1 ? "folder" : "folders"}`,
	);

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

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
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
	<!-- GOV.UK-style masthead hero (mirrors the home page) -->
	<div class="masthead">
		<div class="masthead__inner">
			<h1 class="masthead__title">{displaySource(source.source)}</h1>
			<p class="masthead__description">{summaryLine}</p>
		</div>
	</div>

	<div class="source-page">
		<Breadcrumbs source={source.source} />

		<div class="controls-row">
			<div class="expand-collapse">
				<button class="tree-text-btn" onclick={expandAll}>expand all</button>
				<span class="tree-text-sep">|</span>
				<button class="tree-text-btn" onclick={collapseAll}>collapse all</button>
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

		<div class="concertina">
			{#if rootDocs.length > 0}
				<details class="section" bind:open={sectionOpen[0]}>
					<summary class="section__summary">
						<svg
							class="section__chevron"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<h2 class="section__title">Root Documents</h2>
						<span class="section__count">{rootDocs.length}</span>
					</summary>
					<div class="section__body">
						{#each sortDocs(rootDocs) as doc (doc.doc_id)}
							<a
								href={docUrl(doc.doc_id)}
								class="tree-leaf"
								class:active={currentDocId.value === doc.doc_id}
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									aria-hidden="true"
								>
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
								<span class="leaf-title">{displayTitle(doc)}</span>
							</a>
						{/each}
					</div>
				</details>
			{/if}

			{#each rootNode.children as child, i (child.path)}
				<details class="section" bind:open={sectionOpen[i + 1]}>
					<summary class="section__summary">
						<svg
							class="section__chevron"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<h2 class="section__title">{displaySource(child.name)}</h2>
						<span class="section__count">{collectAllDocs(child).length}</span>
					</summary>
					<div class="section__body">
						<!-- name:"" makes TreeNode render the folder's CONTENTS without
						     repeating the folder's own header (the <h2> already names it). -->
						<TreeNode
							node={{ name: "", path: child.path, children: child.children, docs: child.docs }}
							depth={0}
							expanded={forceExpanded}
							{sortDocs}
						/>
					</div>
				</details>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* GOV.UK masthead — blue hero section. Mirrors src/routes/+page.svelte. */
	.masthead {
		padding: 30px 0;
		border-bottom: 1px solid var(--brand-dark);
		color: #ffffff;
		background-color: var(--brand);
		margin: -40px -30px 0;
		padding-left: 30px;
		padding-right: 30px;
	}

	@media (min-width: 768px) {
		.masthead {
			padding-top: 60px;
			padding-bottom: 60px;
		}
	}

	.masthead__inner {
		max-width: 960px;
		margin: 0 auto;
	}

	.masthead__title {
		color: #ffffff;
		font-size: 2rem;
		line-height: 1.09375;
		font-weight: 700;
		margin-bottom: 15px;
	}

	@media (min-width: 768px) {
		.masthead__title {
			font-size: 3rem;
			line-height: 1.0416666667;
			margin-bottom: 30px;
		}
	}

	.masthead__description {
		color: #ffffff;
		font-size: 1.1875rem;
		line-height: 1.3157894737;
		margin-bottom: 0;
	}

	@media (min-width: 768px) {
		.masthead__description {
			font-size: 1.5rem;
			line-height: 1.25;
		}
	}

	.source-page {
		max-width: 960px;
		margin: 0 auto;
		padding-top: 40px;
	}

	.status {
		padding: 60px;
		text-align: center;
		color: var(--text-secondary);
	}

	.error {
		color: var(--error);
	}

	.controls-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 10px;
		margin-bottom: 20px;
		gap: 12px;
	}

	.sort-toggle {
		display: flex;
		border: 1px solid var(--border);
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
		background: var(--bg-hover);
	}

	.expand-collapse {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
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

	/* Concertina of top-level directories. 1px borders only — no shadows,
	   gradients or rounded corners (GOV.UK aesthetic). */
	.concertina {
		border-top: 1px solid var(--border);
	}

	.section {
		border-bottom: 1px solid var(--border);
	}

	.section__summary {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 0;
		cursor: pointer;
		list-style: none;
		color: var(--text);
	}

	.section__summary::-webkit-details-marker {
		display: none;
	}

	.section__summary:hover {
		color: var(--brand);
	}

	.section__chevron {
		flex-shrink: 0;
		transition: transform 0.1s;
		color: var(--text-secondary);
	}

	.section[open] .section__chevron {
		transform: rotate(90deg);
	}

	.section__title {
		font-size: 21px;
		font-weight: 700;
		margin: 0;
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (min-width: 641px) {
		.section__title {
			font-size: 24px;
		}
	}

	.section__count {
		font-size: 16px;
		font-weight: 400;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.section__body {
		padding: 0 0 12px 0;
	}

	/* Root-level "Files" leaf links — mirror TreeNode's .tree-leaf look but
	   at the GOV.UK ~19px reading scale used on this wide page. */
	.tree-leaf {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px 5px 0;
		color: var(--text);
		font-size: 19px;
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

	/* TreeNode uses compact sizes tuned for the sidebar. On this wide page
	   they read as too small, so bump them via scoped :global overrides —
	   the sidebar is unaffected. GOV.UK ~19px body scale. */
	.section__body :global(.leaf-title) {
		font-size: 19px;
	}

	.section__body :global(.tree-leaf) {
		font-size: 19px;
		padding-top: 5px;
		padding-bottom: 5px;
	}

	.section__body :global(.folder-toggle) {
		font-size: 19px;
		padding-top: 6px;
		padding-bottom: 6px;
	}

	.section__body :global(.count) {
		font-size: 15px;
	}

	@media (max-width: 640px) {
		.controls-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
