<script lang="ts">
	import { fetchTree, searchDocuments, type TreeSource, type SearchResult } from '$lib/api';
	import { currentDocId } from '$lib/stores.svelte';
	import { sourceColor } from '$lib/colors';
	import { page } from '$app/state';

	let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

	let tree: TreeSource[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let expandedSources: Record<string, boolean> = $state({});
	let expandedCategories: Record<string, boolean> = $state({});

	let searchQuery = $state('');
	let searchResults: SearchResult[] = $state([]);
	let searching = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		loadTree();
	});

	async function loadTree() {
		try {
			tree = await fetchTree();
			// Expand all sources by default
			for (const s of tree) {
				expandedSources[s.source] = true;
				expandedCategories[`${s.source}:docs`] = true;
				expandedCategories[`${s.source}:journal`] = true;
				expandedCategories[`${s.source}:engineering_team`] = true;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	function toggleSource(source: string) {
		expandedSources[source] = !expandedSources[source];
	}

	function toggleCategory(key: string) {
		expandedCategories[key] = !expandedCategories[key];
	}

	function expandAll() {
		for (const s of tree) {
			expandedSources[s.source] = true;
			expandedCategories[`${s.source}:docs`] = true;
			expandedCategories[`${s.source}:journal`] = true;
			expandedCategories[`${s.source}:engineering_team`] = true;
		}
	}

	function collapseAll() {
		for (const s of tree) {
			expandedSources[s.source] = false;
			expandedCategories[`${s.source}:docs`] = false;
			expandedCategories[`${s.source}:journal`] = false;
			expandedCategories[`${s.source}:engineering_team`] = false;
		}
	}

	let allExpanded = $derived(tree.length > 0 && tree.every(s => expandedSources[s.source]));

	function handleSearch() {
		clearTimeout(searchTimeout);
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		searching = true;
		searchTimeout = setTimeout(async () => {
			try {
				searchResults = await searchDocuments(searchQuery);
			} catch {
				searchResults = [];
			} finally {
				searching = false;
			}
		}, 300);
	}

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}

	function isActive(docId: string): boolean {
		return currentDocId.value === docId;
	}

	function displayTitle(doc: { title: string | null; file_path: string }): string {
		const filename = doc.file_path.split('/').pop() || doc.file_path;
		return filename.replace(/\.[^.]+$/, '');
	}

	function totalDocs(source: TreeSource): number {
		return source.root_docs.length + source.docs.length + source.journal.length + source.engineering_team.length;
	}
</script>

<div class="sidebar-inner">
	<div class="search-box">
		<input
			type="text"
			placeholder="Search documentation..."
			bind:value={searchQuery}
			oninput={handleSearch}
		/>
	</div>

	{#if searchQuery.trim()}
		<div class="search-results">
			{#if searching}
				<div class="loading-msg">Searching...</div>
			{:else if searchResults.length === 0}
				<div class="loading-msg">No results found</div>
			{:else}
				{#each searchResults as result}
					<a
						href={docUrl(result.doc_id)}
						class="tree-item search-result-item"
						class:active={isActive(result.doc_id)}
						onclick={onNavigate}
					>
						<span class="item-title">{displayTitle(result)}</span>
						<span
							class="source-tag"
							style="background: {sourceColor(result.source).bg}; color: {sourceColor(result.source).text}"
						>{result.source}</span>
						<span class="item-snippet">{result.snippet}</span>
					</a>
				{/each}
			{/if}
		</div>
	{:else if loading}
		<div class="loading-msg">Loading sources...</div>
	{:else if error}
		<div class="error-msg">{error}</div>
	{:else}
		<div class="tree-actions">
			<a href="/journal" class="journal-link" onclick={onNavigate}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
				All Journal Entries
			</a>
		</div>
		<nav class="tree">
			<div class="tree-header">
				<span class="tree-header-label">Documents</span>
				<div class="expand-collapse">
					{#if allExpanded}
						<button class="tree-action-btn" onclick={collapseAll} title="Collapse all">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="4 14 10 14 10 20" />
								<polyline points="20 10 14 10 14 4" />
								<line x1="14" y1="10" x2="21" y2="3" />
								<line x1="3" y1="21" x2="10" y2="14" />
							</svg>
						</button>
					{:else}
						<button class="tree-action-btn" onclick={expandAll} title="Expand all">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="15 3 21 3 21 9" />
								<polyline points="9 21 3 21 3 15" />
								<line x1="21" y1="3" x2="14" y2="10" />
								<line x1="3" y1="21" x2="10" y2="14" />
							</svg>
						</button>
					{/if}
				</div>
			</div>
			{#each tree as source}
				<div class="tree-source">
					<button class="tree-toggle" onclick={() => toggleSource(source.source)}>
						<svg class="chevron" class:expanded={expandedSources[source.source]} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<span
							class="source-tag"
							style="background: {sourceColor(source.source).bg}; color: {sourceColor(source.source).text}"
						>{source.source}</span>
						<span class="count">{totalDocs(source)}</span>
					</button>

					{#if expandedSources[source.source]}
						{#if source.root_docs.length > 0}
							<div class="tree-items root-docs">
								{#each source.root_docs as doc}
									<a
										href={docUrl(doc.doc_id)}
										class="tree-item"
										class:active={isActive(doc.doc_id)}
										onclick={onNavigate}
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
										</svg>
										<span class="item-title">{displayTitle(doc)}</span>
									</a>
								{/each}
							</div>
						{/if}

						{#if source.docs.length > 0}
							<div class="tree-category">
								<button class="tree-toggle category-toggle" onclick={() => toggleCategory(`${source.source}:docs`)}>
									<svg class="chevron" class:expanded={expandedCategories[`${source.source}:docs`]} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="9 18 15 12 9 6" />
									</svg>
									<span>Documentation</span>
									<span class="count">{source.docs.length}</span>
								</button>

								{#if expandedCategories[`${source.source}:docs`]}
									<div class="tree-items">
										{#each source.docs as doc}
											<a
												href={docUrl(doc.doc_id)}
												class="tree-item"
												class:active={isActive(doc.doc_id)}
												onclick={onNavigate}
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
													<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
													<polyline points="14 2 14 8 20 8" />
												</svg>
												<span class="item-title">{displayTitle(doc)}</span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						{#if source.journal.length > 0}
							<div class="tree-category">
								<button class="tree-toggle category-toggle" onclick={() => toggleCategory(`${source.source}:journal`)}>
									<svg class="chevron" class:expanded={expandedCategories[`${source.source}:journal`]} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="9 18 15 12 9 6" />
									</svg>
									<span>Development Journal</span>
									<span class="count">{source.journal.length}</span>
								</button>

								{#if expandedCategories[`${source.source}:journal`]}
									<div class="tree-items">
										{#each source.journal as doc}
											<a
												href={docUrl(doc.doc_id)}
												class="tree-item"
												class:active={isActive(doc.doc_id)}
												onclick={onNavigate}
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
													<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
													<line x1="16" y1="2" x2="16" y2="6" />
													<line x1="8" y1="2" x2="8" y2="6" />
													<line x1="3" y1="10" x2="21" y2="10" />
												</svg>
												<span class="item-title">{displayTitle(doc)}</span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						{#if source.engineering_team.length > 0}
							<div class="tree-category">
								<button class="tree-toggle category-toggle" onclick={() => toggleCategory(`${source.source}:engineering_team`)}>
									<svg class="chevron" class:expanded={expandedCategories[`${source.source}:engineering_team`]} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="9 18 15 12 9 6" />
									</svg>
									<span>Engineering Analysis</span>
									<span class="count">{source.engineering_team.length}</span>
								</button>

								{#if expandedCategories[`${source.source}:engineering_team`]}
									<div class="tree-items">
										{#each source.engineering_team as doc}
											<a
												href={docUrl(doc.doc_id)}
												class="tree-item"
												class:active={isActive(doc.doc_id)}
												onclick={onNavigate}
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
													<circle cx="12" cy="12" r="3" />
													<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
												</svg>
												<span class="item-title">{displayTitle(doc)}</span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
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
	}

	.search-box {
		padding: 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.search-box input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.search-box input:focus {
		border-color: var(--accent);
	}

	.search-box input::placeholder {
		color: var(--text-dim);
	}

	.tree-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.journal-link {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
		font-size: 0.8rem;
		text-decoration: none;
		transition: color 0.15s;
	}

	.journal-link:hover {
		color: var(--accent);
	}

	.tree-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.75rem;
	}

	.tree-header-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-dim);
	}

	.expand-collapse {
		display: flex;
		gap: 0.25rem;
	}

	.tree-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem;
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s;
	}

	.tree-action-btn:hover {
		background: var(--bg-hover);
		color: var(--text);
		border-color: var(--text-dim);
	}

	.loading-msg, .error-msg {
		padding: 1rem;
		color: var(--text-muted);
		font-size: 0.85rem;
		text-align: center;
	}

	.error-msg {
		color: #f87171;
	}

	.tree {
		flex: 1;
		overflow-y: auto;
		padding: 0.25rem 0 0.5rem;
	}

	.tree-source {
		margin-bottom: 0.25rem;
	}

	.tree-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.4rem 0.75rem;
		background: none;
		border: none;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		border-radius: 0;
		transition: background 0.1s;
	}

	.tree-toggle:hover {
		background: var(--bg-hover);
	}

	.category-toggle {
		font-weight: 500;
		color: var(--text-muted);
		padding-left: 1.5rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.15s;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.source-tag {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.count {
		font-size: 0.7rem;
		color: var(--text-dim);
		background: var(--bg);
		padding: 0.1rem 0.4rem;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.tree-items {
		padding: 0.15rem 0;
	}

	.root-docs {
		padding-left: 0;
	}

	.tree-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem 0.35rem 2.5rem;
		color: var(--text-muted);
		font-size: 0.9rem;
		text-decoration: none;
		transition: all 0.1s;
		border-left: 2px solid transparent;
	}

	.tree-item:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.tree-item.active {
		background: var(--accent-dim);
		color: var(--accent);
		border-left-color: var(--accent);
	}

	.item-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.search-result-item {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		padding-left: 1rem;
	}

	.item-snippet {
		font-size: 0.75rem;
		color: var(--text-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
	}

	.search-results {
		flex: 1;
		overflow-y: auto;
	}

	@media (max-width: 600px) {
		.tree-toggle {
			padding: 0.75rem;
			min-height: 44px;
		}
		.category-toggle {
			padding-left: 1.5rem;
			min-height: 44px;
		}
		.tree-item {
			padding: 0.75rem 0.75rem 0.75rem 2.5rem;
			min-height: 44px;
		}
		.tree-action-btn {
			min-height: 44px;
			min-width: 44px;
			padding: 0.5rem;
		}
		.search-box input {
			min-height: 44px;
			font-size: 1rem;
		}
		.journal-link {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			font-size: 0.9rem;
		}
		.search-result-item {
			padding: 0.75rem 1rem;
			min-height: 44px;
		}
	}
</style>
