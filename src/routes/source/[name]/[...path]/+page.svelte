<script lang="ts">
	import { page } from "$app/state";
	import { fetchSourceTree, type SourceTree, type TreeDocument } from "$lib/api";
	import {
		buildFolderTree,
		collectAllDocs,
		findFolderNode,
		type FolderNode,
	} from "$lib/tree";
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

	// Route rest param is `/`-joined, each segment encodeURIComponent-encoded
	// by Breadcrumbs. Decode per segment, re-join with literal `/`.
	let folderPath = $derived(
		(page.params.path ?? "")
			.split("/")
			.filter(Boolean)
			.map(decodeURIComponent)
			.join("/"),
	);

	// Parent path (folderPath minus its last segment). Drives the masthead
	// caption ("Relay › Documentation") and the Breadcrumbs current-crumb
	// suppression below.
	let parentPath = $derived(
		folderPath.split("/").filter(Boolean).slice(0, -1).join("/"),
	);

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

	const folderNode = $derived<FolderNode | null>(
		rootNode ? findFolderNode(rootNode, folderPath) : null,
	);

	const totalDocs = $derived(folderNode ? collectAllDocs(folderNode).length : 0);
	// "Subfolders" = number of immediate child directories under this folder
	// (recursive descendants are surfaced as sibling table groups below).
	const folderCount = $derived(folderNode ? folderNode.children.length : 0);

	const summaryLine = $derived(
		`${totalDocs} ${totalDocs === 1 ? "document" : "documents"} in ` +
			`${folderCount} ${folderCount === 1 ? "subfolder" : "subfolders"}`,
	);

	// Format a single path segment the way breadcrumbs / table-group headings
	// do: rewrite `docs` → "Documentation", Title-Case everything else.
	function labelSegment(seg: string): string {
		const overridden = displayFolderName(seg);
		return overridden === seg ? displaySource(seg) : overridden;
	}

	// Format a `/`-joined relative path as "Documentation / Archive".
	function groupLabel(dir: string): string {
		if (dir === "") return "Files";
		return dir.split("/").filter(Boolean).map(labelSegment).join(" / ");
	}

	// Folder H1: format the current folder's own segment, falling back to the
	// source name for the (unusual) zero-segment case.
	const folderTitle = $derived.by(() => {
		if (!folderNode) return "";
		const name = folderNode.name;
		if (!name) return displaySource(sourceName);
		return labelSegment(name);
	});

	// Caption-xl above the H1: the chain of ancestor labels, separated by
	// the GOV.UK chevron glyph. "Relay › Documentation" for /source/relay/
	// docs/proposals. Always at least the source name; never the current
	// folder (that's the H1).
	const mastheadCaption = $derived.by(() => {
		const segs: string[] = [];
		segs.push(displaySource(source?.source ?? sourceName));
		for (const seg of parentPath.split("/").filter(Boolean)) {
			segs.push(labelSegment(seg));
		}
		return segs.join(" › ");
	});

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

	// Walk the FolderNode subtree under the current folder and emit one group
	// per directory that contains docs. `dir` is `/`-joined relative to the
	// current folder ("" for the current folder's own docs).
	function collectGroups(node: FolderNode, prefix: string): DocGroup[] {
		const out: DocGroup[] = [];
		if (node.docs.length > 0) {
			out.push({
				dir: prefix,
				label: groupLabel(prefix),
				docs: sortDocs(node.docs),
			});
		}
		for (const child of node.children) {
			const childDir = prefix === "" ? child.name : `${prefix}/${child.name}`;
			out.push(...collectGroups(child, childDir));
		}
		return out;
	}

	const groups = $derived.by<DocGroup[]>(() => {
		if (!folderNode) return [];
		const result = collectGroups(folderNode, "");
		// Current folder's "Files" group first, then descendants alphabetically.
		result.sort((a, b) => {
			if (a.dir === "" && b.dir !== "") return -1;
			if (b.dir === "" && a.dir !== "") return 1;
			return a.label.localeCompare(b.label);
		});
		return result;
	});

	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}
</script>

<svelte:head>
	<title>{folderTitle} - {displaySource(sourceName)} - Documentation Library</title>
</svelte:head>

{#if loading}
	<div class="status"><p>Loading...</p></div>
{:else if error}
	<div class="status">
		<p class="error">{error}</p>
		<a href="/">Back to home</a>
	</div>
{:else if source && rootNode && folderNode}
	<!-- GOV.UK-style masthead hero. The caption-xl above the H1 gives the
	     parent-folder context at a glance; the breadcrumb below still
	     provides clickable navigation. -->
	<div class="masthead">
		<div class="masthead__inner">
			<span class="masthead__caption">{mastheadCaption}</span>
			<h1 class="masthead__title">{folderTitle}</h1>
			<p class="masthead__description">{summaryLine}</p>
		</div>
	</div>

	<div class="source-page">
		<Breadcrumbs
			source={source.source}
			filePath={parentPath ? `${parentPath}/_` : undefined}
			title={folderTitle}
		/>

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
								<th scope="col">Filename</th>
								<th scope="col">Modified</th>
								<th scope="col">Created</th>
								<th scope="col" class="num">Lines</th>
							</tr>
						</thead>
						<tbody>
							{#each group.docs as doc (doc.doc_id)}
								<tr class:active={currentDocId.value === doc.doc_id}>
									<td class="cell-title">
										<a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
									</td>
									<td class="cell-path">{doc.file_path.split("/").pop() ?? doc.file_path}</td>
									<td class="cell-date"
										>{doc.modified_at ? formatDateTime(doc.modified_at) : "—"}</td
									>
									<td class="cell-date"
										>{doc.created_at ? formatDateTime(doc.created_at) : "—"}</td
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
{:else if source}
	<div class="status">
		<p class="error">Folder not found</p>
		<a href="/source/{encodeURIComponent(sourceName)}"
			>Back to {displaySource(sourceName)}</a
		>
	</div>
{/if}

<style>
	/* GOV.UK masthead — blue hero section. Mirrors the source page. */
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

	/* GOV.UK caption-xl overline. Renders the chain of parent folder labels
	   above the H1 so each page asserts its position in the source tree at
	   masthead size without making the user re-read the breadcrumb. */
	.masthead__caption {
		display: block;
		color: #ffffff;
		font-size: 1.125rem;
		line-height: 1.1111111111;
		font-weight: 400;
		opacity: 0.85;
		margin-bottom: 5px;
	}

	@media (min-width: 768px) {
		.masthead__caption {
			font-size: 1.5rem;
			line-height: 1.25;
			margin-bottom: 10px;
		}
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

	/* One flat (non-indented) group per directory. Current folder's docs
	   render in a "Files" group; each descendant directory becomes a
	   sibling group (e.g. "Archive"), not an indented child. */
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
