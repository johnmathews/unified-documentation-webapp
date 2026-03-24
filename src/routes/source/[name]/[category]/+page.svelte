<script lang="ts">
	import { page } from '$app/state';
	import { fetchTree, type TreeDocument } from '$lib/api';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { currentDocId } from '$lib/stores.svelte';

	let docs: TreeDocument[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	let sourceName = $derived(decodeURIComponent(page.params.name ?? ''));
	let category = $derived(page.params.category ?? '');

	$effect(() => {
		currentDocId.value = null;
		loadCategory(sourceName, category);
	});

	async function loadCategory(name: string, cat: string) {
		loading = true;
		error = '';
		try {
			const tree = await fetchTree();
			const source = tree.find((s) => s.source === name);
			if (!source) { error = `Source "${name}" not found`; return; }
			if (cat === 'docs') docs = source.docs;
			else if (cat === 'journal') docs = source.journal;
			else { error = `Unknown category "${cat}"`; return; }
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

	let categoryLabel = $derived(category === 'journal' ? 'Development Journal' : 'Documentation');
</script>

<svelte:head>
	<title>{categoryLabel} - {sourceName} - Documentation</title>
</svelte:head>

{#if loading}
	<div class="status"><p>Loading...</p></div>
{:else if error}
	<div class="status"><p class="error">{error}</p><a href="/">Back to home</a></div>
{:else}
	<div class="category-page">
		<Breadcrumbs source={sourceName} {category} />
		<h1>{categoryLabel}</h1>
		<p class="subtitle">{sourceName} &middot; {docs.length} {docs.length === 1 ? 'document' : 'documents'}</p>

		{#if docs.length === 0}
			<p class="empty">No documents in this category.</p>
		{:else}
			<ul class="doc-list">
				{#each docs as doc}
					<li>
						<a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
						<span class="date">{formatDate(doc.created_at || doc.modified_at)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.category-page { max-width: 800px; margin: 0 auto; }
	.status { padding: 4rem; text-align: center; color: var(--text-muted); }
	.error { color: #f87171; }
	h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
	.subtitle { color: var(--text-muted); margin-bottom: 2rem; }
	.empty { color: var(--text-dim); font-style: italic; }
	.doc-list { list-style: none; }
	.doc-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
	.doc-list a { color: var(--text); font-size: 0.95rem; }
	.doc-list a:hover { color: var(--accent); }
	.date { font-size: 0.8rem; color: var(--text-dim); flex-shrink: 0; margin-left: 1rem; }
</style>
