<script lang="ts">
	import { fetchTree, type TreeDocument } from '$lib/api';
	import { currentDocId } from '$lib/stores.svelte';
	import { sourceColor } from '$lib/colors';

	interface JournalEntry extends TreeDocument {
		source: string;
	}

	let entries: JournalEntry[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		currentDocId.value = null;
		loadJournal();
	});

	async function loadJournal() {
		try {
			const tree = await fetchTree();
			const all: JournalEntry[] = [];
			for (const source of tree) {
				for (const doc of source.journal) {
					all.push({ ...doc, source: source.source });
				}
			}
			all.sort((a, b) => {
				const da = a.created_at || a.modified_at || '';
				const db = b.created_at || b.modified_at || '';
				return db.localeCompare(da);
			});
			entries = all;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}

	function displayTitle(doc: JournalEntry): string {
		const filename = doc.file_path.split('/').pop() || doc.file_path;
		return filename.replace(/\.[^.]+$/, '');
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	// Group entries by month/year for timeline sections
	function monthKey(dateStr: string | null): string {
		if (!dateStr) return 'Unknown date';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric',
				month: 'long'
			});
		} catch {
			return 'Unknown date';
		}
	}

	let groupedEntries = $derived.by(() => {
		const groups: { month: string; entries: JournalEntry[] }[] = [];
		let currentMonth = '';
		for (const entry of entries) {
			const key = monthKey(entry.created_at || entry.modified_at);
			if (key !== currentMonth) {
				currentMonth = key;
				groups.push({ month: key, entries: [] });
			}
			groups[groups.length - 1].entries.push(entry);
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Journal Timeline - Documentation</title>
</svelte:head>

{#if loading}
	<div class="status"><p>Loading...</p></div>
{:else if error}
	<div class="status"><p class="error">{error}</p><a href="/">Back to home</a></div>
{:else}
	<div class="journal-page">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/">Home</a>
			<span class="sep">/</span>
			<span class="current">Journal Timeline</span>
		</nav>

		<h1>Journal Timeline</h1>
		<p class="subtitle">All development journal entries across {new Set(entries.map(e => e.source)).size} projects &middot; {entries.length} entries</p>

		{#if entries.length === 0}
			<p class="empty">No journal entries found.</p>
		{:else}
			<div class="timeline">
				{#each groupedEntries as group}
					<div class="month-group">
						<h2 class="month-header">{group.month}</h2>
						<div class="entries">
							{#each group.entries as entry}
								<a href={docUrl(entry.doc_id)} class="entry-card">
									<div class="entry-header">
										<span class="entry-title">{displayTitle(entry)}</span>
										<span class="entry-date">{formatDate(entry.created_at || entry.modified_at)}</span>
									</div>
									<span
										class="entry-source"
										style="background: {sourceColor(entry.source).bg}; color: {sourceColor(entry.source).text}"
									>{entry.source}</span>
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.journal-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.status {
		padding: 4rem;
		text-align: center;
		color: var(--text-muted);
	}

	.error {
		color: #f87171;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.breadcrumbs a {
		color: var(--text-muted);
		transition: color 0.1s;
	}

	.breadcrumbs a:hover {
		color: var(--accent);
	}

	.sep {
		color: var(--text-dim);
	}

	.current {
		color: var(--text);
		font-weight: 500;
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--text-muted);
		margin-bottom: 2rem;
	}

	.empty {
		color: var(--text-dim);
		font-style: italic;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.month-header {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: 0.5rem;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.entry-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		text-decoration: none;
		transition: background 0.15s;
		border-left: 2px solid transparent;
	}

	.entry-card:hover {
		background: var(--bg-surface);
		border-left-color: var(--accent);
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}

	.entry-title {
		color: var(--text);
		font-size: 0.95rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.entry-date {
		font-size: 0.8rem;
		color: var(--text-dim);
		flex-shrink: 0;
	}

	.entry-source {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		width: fit-content;
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		.entry-header {
			flex-direction: column;
			gap: 0.15rem;
		}

		.entry-date {
			order: -1;
		}
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 1.5rem;
		}
		.breadcrumbs {
			font-size: 0.9rem;
		}
		.breadcrumbs a {
			padding: 0.4rem 0.25rem;
			min-height: 44px;
			display: inline-flex;
			align-items: center;
		}
		.month-header {
			font-size: 0.875rem;
		}
		.entry-title {
			font-size: 1rem;
		}
		.entry-date {
			font-size: 0.875rem;
		}
		.entry-source {
			font-size: 0.8rem;
			padding: 0.15rem 0.5rem;
		}
		.entry-card {
			min-height: 44px;
			padding: 0.75rem 1rem;
		}
	}
</style>
