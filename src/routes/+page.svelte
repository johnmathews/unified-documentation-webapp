<script lang="ts">
	import { fetchTree, type TreeSource } from '$lib/api';
	import { currentDocId } from '$lib/stores.svelte';
	import { sourceColor } from '$lib/colors';

	let tree: TreeSource[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		currentDocId.value = null;
		loadTree();
	});

	async function loadTree() {
		try {
			tree = await fetchTree();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}

	function displayTitle(doc: { title: string | null; file_path: string }): string {
		const filename = doc.file_path.split('/').pop() || doc.file_path;
		return filename.replace(/\.[^.]+$/, '');
	}
</script>

<svelte:head>
	<title>Documentation</title>
</svelte:head>

<div class="home">
	<h1>Documentation</h1>
	<p class="subtitle">Browse documentation from all indexed sources, or use the chat to ask questions.</p>

	{#if loading}
		<div class="loading">Loading sources...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if tree.length === 0}
		<div class="empty">
			<p>No documentation sources have been indexed yet.</p>
			<p>Check that the MCP server is running and has sources configured.</p>
		</div>
	{:else}
		<div class="sources-grid">
			{#each tree as source}
				<div class="source-card" style="border-color: {sourceColor(source.source).text}; background: {sourceColor(source.source).bg};">
					<h2><a href="/source/{encodeURIComponent(source.source)}">{source.source}</a></h2>
					<div class="stats">
						<span>{source.docs.length} docs</span>
						<span>{source.journal.length} journal entries</span>
						<span>{source.engineering_team?.length ?? 0} engineering analyses</span>
					</div>

					{#if source.docs.length > 0}
						<div class="doc-section">
							<h3><a href="/source/{encodeURIComponent(source.source)}/docs">Documentation</a></h3>
							<ul>
								{#each source.docs.slice(0, 5) as doc}
									<li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
								{/each}
								{#if source.docs.length > 5}
									<li class="more">+{source.docs.length - 5} more</li>
								{/if}
							</ul>
						</div>
					{/if}

					{#if source.journal.length > 0}
						<div class="doc-section">
							<h3><a href="/source/{encodeURIComponent(source.source)}/journal">Recent Journal Entries</a></h3>
							<ul>
								{#each source.journal.slice(0, 3) as doc}
									<li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
								{/each}
								{#if source.journal.length > 3}
									<li class="more">+{source.journal.length - 3} more</li>
								{/if}
							</ul>
						</div>
					{/if}

					{#if (source.engineering_team?.length ?? 0) > 0}
						<div class="doc-section">
							<h3><a href="/source/{encodeURIComponent(source.source)}/engineering_team">Engineering Analysis</a></h3>
							<ul>
								{#each (source.engineering_team ?? []).slice(0, 3) as doc}
									<li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
								{/each}
								{#if (source.engineering_team?.length ?? 0) > 3}
									<li class="more">+{(source.engineering_team?.length ?? 0) - 3} more</li>
								{/if}
							</ul>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.home {
		max-width: 900px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--text-muted);
		margin-bottom: 2rem;
	}

	.loading, .error, .empty {
		padding: 2rem;
		text-align: center;
		color: var(--text-muted);
	}

	.error {
		color: #f87171;
	}

	.sources-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr));
		gap: 1.25rem;
	}

	.source-card {
		border: 1px solid;
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.source-card h2 {
		font-size: 1.2rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.source-card h2 a {
		color: var(--text);
	}

	.source-card h2 a:hover {
		color: var(--accent);
	}

	.stats {
		display: flex;
		gap: 1rem;
		font-size: 0.8rem;
		color: var(--text-dim);
		margin-bottom: 1rem;
	}

	.doc-section {
		margin-top: 1rem;
	}

	.doc-section h3 {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 0.5rem;
	}

	.doc-section ul {
		list-style: none;
		padding: 0;
	}

	.doc-section li {
		padding: 0.3rem 0;
	}

	.doc-section a {
		font-size: 0.9rem;
		color: var(--text);
		transition: color 0.1s;
	}

	.doc-section a:hover {
		color: var(--accent);
	}

	.more {
		font-size: 0.8rem;
		color: var(--text-dim);
	}

	@media (max-width: 640px) {
		.sources-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 1.5rem;
		}
		.subtitle {
			font-size: 1rem;
		}
		.stats {
			font-size: 0.875rem;
		}
		.doc-section h3 {
			font-size: 0.875rem;
		}
		.doc-section li {
			padding: 0.5rem 0;
		}
		.doc-section a {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			font-size: 1rem;
		}
		.more {
			font-size: 0.875rem;
		}
	}
</style>
