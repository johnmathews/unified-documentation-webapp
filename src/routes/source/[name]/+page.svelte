<script lang="ts">
	import { page } from '$app/state';
	import { fetchTree, type TreeSource, type TreeDocument } from '$lib/api';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { currentDocId } from '$lib/stores.svelte';

	let source: TreeSource | null = $state(null);
	let loading = $state(true);
	let error = $state('');

	let sourceName = $derived(decodeURIComponent(page.params.name ?? ''));

	$effect(() => {
		currentDocId.value = null;
		loadSource(sourceName);
	});

	async function loadSource(name: string) {
		loading = true;
		error = '';
		try {
			const tree = await fetchTree();
			source = tree.find((s) => s.source === name) ?? null;
			if (!source) error = `Source "${name}" not found`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}

	function displayTitle(doc: TreeDocument): string {
		const filename = doc.file_path.split('/').pop() || doc.file_path;
		return filename.replace(/\.[^.]+$/, '');
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric', month: 'short', day: 'numeric'
			});
		} catch { return dateStr; }
	}
</script>

<svelte:head>
	<title>{sourceName} - Documentation</title>
</svelte:head>

{#if loading}
	<div class="status"><p>Loading...</p></div>
{:else if error}
	<div class="status"><p class="error">{error}</p><a href="/">Back to home</a></div>
{:else if source}
	<div class="source-page">
		<Breadcrumbs source={source.source} />
		<h1>{source.source}</h1>
		<p class="subtitle">{source.docs.length} docs, {source.journal.length} journal entries, {source.engineering_team?.length ?? 0} engineering analyses</p>

		{#if source.docs.length > 0}
			<section>
				<h2><a href="/source/{encodeURIComponent(source.source)}/docs">Documentation</a></h2>
				<ul class="doc-list">
					{#each source.docs as doc}
						<li>
							<a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
							{#if doc.modified_at}
								<span class="date">{formatDate(doc.modified_at)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if source.journal.length > 0}
			<section>
				<h2><a href="/source/{encodeURIComponent(source.source)}/journal">Development Journal</a></h2>
				<ul class="doc-list">
					{#each source.journal as doc}
						<li>
							<a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
							{#if doc.created_at}
								<span class="date">{formatDate(doc.created_at)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if (source.engineering_team?.length ?? 0) > 0}
			<section>
				<h2><a href="/source/{encodeURIComponent(source.source)}/engineering_team">Engineering Analysis</a></h2>
				<ul class="doc-list">
					{#each (source.engineering_team ?? []) as doc}
						<li>
							<a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
							{#if doc.modified_at}
								<span class="date">{formatDate(doc.modified_at)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
{/if}

<style>
	.source-page { max-width: 800px; margin: 0 auto; }
	.status { padding: 4rem; text-align: center; color: var(--text-muted); }
	.error { color: #f87171; }
	h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
	.subtitle { color: var(--text-muted); margin-bottom: 2rem; }
	section { margin-bottom: 2rem; }
	h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
	h2 a { color: var(--text); }
	h2 a:hover { color: var(--accent); }
	.doc-list { list-style: none; }
	.doc-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
	.doc-list a { color: var(--text); font-size: 0.95rem; }
	.doc-list a:hover { color: var(--accent); }
	.date { font-size: 0.8rem; color: var(--text-dim); flex-shrink: 0; margin-left: 1rem; }

	@media (max-width: 600px) {
		h1 { font-size: 1.5rem; }
		.subtitle { font-size: 1rem; }
		.doc-list li {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			padding: 0.75rem 0;
		}
		.doc-list a {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			font-size: 1rem;
		}
		.date { margin-left: 0; font-size: 0.875rem; }
	}
</style>
