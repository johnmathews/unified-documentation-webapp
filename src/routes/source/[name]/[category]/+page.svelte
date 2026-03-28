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
			else if (cat === 'engineering_team') docs = source.engineering_team ?? [];
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

	import { displayTitle, displaySource } from "$lib/titles";

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric', month: 'short', day: 'numeric'
			});
		} catch { return dateStr; }
	}

	let categoryLabel = $derived(category === 'journal' ? 'Development Journal' : category === 'engineering_team' ? 'Engineering Team' : 'Documentation');
</script>

<svelte:head>
	<title>{categoryLabel} - {displaySource(sourceName)} - Documentation</title>
</svelte:head>

{#if loading}
	<div class="status"><p>Loading...</p></div>
{:else if error}
	<div class="status"><p class="error">{error}</p><a href="/">Back to home</a></div>
{:else}
	<div class="category-page">
		<Breadcrumbs source={sourceName} {category} />
		<h1>{categoryLabel}</h1>
		<p class="subtitle">{displaySource(sourceName)} &middot; {docs.length} {docs.length === 1 ? 'document' : 'documents'}</p>

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
	.category-page { max-width: 960px; margin: 0 auto; }
	.status { padding: 60px; text-align: center; color: var(--text-secondary); }
	.error { color: var(--error); }
	h1 { font-size: 48px; font-weight: 700; margin-bottom: 5px; }
	.subtitle { color: var(--text-secondary); margin-bottom: 30px; font-size: 16px; }
	.empty { color: var(--text-muted); font-style: italic; }
	.doc-list { list-style: none; }
	.doc-list li { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
	.doc-list a { color: var(--link); font-size: 16px; }
	.doc-list a:hover { color: var(--link-hover); }
	.date { font-size: 16px; color: var(--text-secondary); flex-shrink: 0; margin-left: 15px; }

	@media (max-width: 640px) {
		h1 { font-size: 32px; }
		.subtitle { font-size: 16px; }
		.doc-list li {
			flex-direction: column;
			align-items: flex-start;
			gap: 5px;
			padding: 10px 0;
		}
		.doc-list a {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			font-size: 16px;
		}
		.date { margin-left: 0; font-size: 14px; }
	}
</style>
