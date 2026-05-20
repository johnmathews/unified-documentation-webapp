<script lang="ts">
	import { page } from "$app/state";
	import { fetchSourceTree, type SourceTree, type TreeDocument } from "$lib/api";
	import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
	import { currentDocId, currentPageContext } from "$lib/stores.svelte";
	import { displayTitle, displaySource, displayFolderName } from "$lib/titles";
	import { formatDateTime } from "$lib/datetime";

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

	// Directory of a file_path: everything before the last "/", or "" for
	// files that live at the repo root.
	function dirOf(filePath: string): string {
		const i = filePath.lastIndexOf("/");
		return i === -1 ? "" : filePath.slice(0, i);
	}

	// "docs" → "Documentation", "docs/archive" → "Documentation / Archive".
	// The repo root becomes the "Root Documents" group. Each directory is
	// its own flat, non-indented group (e.g. "Documentation" and
	// "Documentation / Archive" are siblings). `displayFolderName` handles
	// the docs→Documentation rewrite; non-overridden segments fall back to
	// `displaySource` for Title Case.
	function groupLabel(dir: string): string {
		if (dir === "") return "Root Documents";
		return dir
			.split("/")
			.filter(Boolean)
			.map((seg) => {
				const overridden = displayFolderName(seg);
				return overridden === seg ? displaySource(seg) : overridden;
			})
			.join(" / ");
	}

	interface DocGroup {
		label: string;
		dir: string;
		docs: TreeDocument[];
	}

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

	const groups = $derived.by<DocGroup[]>(() => {
		if (!source) return [];
		const byDir: Record<string, TreeDocument[]> = {};
		for (const doc of source.files) {
			const dir = dirOf(doc.file_path);
			(byDir[dir] ??= []).push(doc);
		}
		const result: DocGroup[] = Object.entries(byDir).map(([dir, docs]) => ({
			label: groupLabel(dir),
			dir,
			docs: sortDocs(docs),
		}));
		// Root Documents first, then directories alphabetically by label.
		result.sort((a, b) => {
			if (a.dir === "" && b.dir !== "") return -1;
			if (b.dir === "" && a.dir !== "") return 1;
			return a.label.localeCompare(b.label);
		});
		return result;
	});

	const totalDocs = $derived(source ? source.files.length : 0);
	const folderCount = $derived(groups.filter((g) => g.dir !== "").length);

	const summaryLine = $derived(
		`${totalDocs} ${totalDocs === 1 ? "document" : "documents"} in ` +
			`${folderCount} ${folderCount === 1 ? "folder" : "folders"}`,
	);

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
{:else if source}
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
			<div class="sort-toggle">
				<button class:active={sortMode === "date"} onclick={() => (sortMode = "date")}
					>Recent</button
				>
				<button class:active={sortMode === "alpha"} onclick={() => (sortMode = "alpha")}
					>A–Z</button
				>
			</div>
		</div>

		{#each groups as group (group.dir)}
			<section class="doc-group">
				<div class="doc-group__head">
					<h2 class="doc-group__title">{group.label}</h2>
					<span class="doc-group__count">{group.docs.length}</span>
				</div>
				<div class="table-scroll">
					<table class="doc-table">
						<thead>
							<tr>
								<th scope="col">Title</th>
								<th scope="col">Path</th>
								<th scope="col">Modified</th>
								<th scope="col" class="num">Lines</th>
							</tr>
						</thead>
						<tbody>
							{#each group.docs as doc (doc.doc_id)}
								<tr class:active={currentDocId.value === doc.doc_id}>
									<td class="cell-title">
										<a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
									</td>
									<td class="cell-path">{doc.file_path}</td>
									<td class="cell-date"
										>{doc.modified_at ? formatDateTime(doc.modified_at) : "—"}</td
									>
									<td class="num"
										>{doc.line_count == null ? "—" : doc.line_count.toLocaleString()}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
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
		justify-content: flex-end;
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

	/* One flat (non-indented) group per directory. "Docs" and "Docs / Archive"
	   are siblings, not nested. GOV.UK aesthetic: 1px borders, no shadows. */
	.doc-group {
		margin-bottom: 40px;
	}

	.doc-group__head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding-bottom: 10px;
		border-bottom: 2px solid var(--text);
		margin-bottom: 0;
	}

	.doc-group__title {
		font-size: 21px;
		font-weight: 700;
		margin: 0;
	}

	@media (min-width: 641px) {
		.doc-group__title {
			font-size: 24px;
		}
	}

	.doc-group__count {
		font-size: 16px;
		font-weight: 400;
		color: var(--text-secondary);
	}

	.table-scroll {
		overflow-x: auto;
	}

	.doc-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 16px;
	}

	.doc-table th {
		text-align: left;
		font-weight: 700;
		padding: 10px 20px 10px 0;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		white-space: nowrap;
	}

	.doc-table td {
		padding: 10px 20px 10px 0;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		vertical-align: top;
	}

	.doc-table tr.active td {
		background: var(--accent-dim);
	}

	.doc-table tbody tr:hover td {
		background: var(--bg-hover);
	}

	.cell-title a {
		font-weight: 600;
	}

	.cell-path {
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--text-secondary);
		word-break: break-all;
	}

	.cell-date {
		white-space: nowrap;
		color: var(--text-secondary);
	}

	.doc-table .num {
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
	}

	@media (max-width: 640px) {
		.doc-table {
			font-size: 15px;
		}
		.doc-table th,
		.doc-table td {
			padding-right: 12px;
		}
	}
</style>
