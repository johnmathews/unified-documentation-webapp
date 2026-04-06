<script lang="ts">
 import { page } from "$app/state";
 import { fetchTree, type TreeSource, type TreeDocument } from "$lib/api";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import { currentDocId } from "$lib/stores.svelte";
 import { displayTitle, displaySource } from "$lib/titles";

 let source: TreeSource | null = $state(null);
 let loading = $state(true);
 let error = $state("");

 type SortMode = "date" | "alpha";
 let sortMode: SortMode = $state("date");

 let sourceName = $derived(decodeURIComponent(page.params.name ?? ""));

 $effect(() => {
  currentDocId.value = null;
  loadSource(sourceName);
 });

 async function loadSource(name: string) {
  loading = true;
  error = "";
  try {
   const tree = await fetchTree();
   source = tree.find((s) => s.source === name) ?? null;
   if (!source) error = `Source "${name}" not found`;
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 function sortDocs(docs: TreeDocument[]): TreeDocument[] {
  const copy = [...docs];
  if (sortMode === "alpha") {
   copy.sort((a, b) => (displayTitle(a)).localeCompare(displayTitle(b)));
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

 function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
   return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
   });
  } catch {
   return dateStr;
  }
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
 <div class="source-page">
  <Breadcrumbs source={source.source} />
  <h1>{displaySource(source.source)}</h1>
  <div class="controls-row">
   <div class="stats">
    <span class="stat-tag">{source.root_docs.length + source.docs.length} docs</span>
    <span class="stat-tag">{source.journal.length} journal</span>
    {#if (source.learning_journal?.length ?? 0) > 0}
     <span class="stat-tag">{source.learning_journal?.length ?? 0} learning</span>
    {/if}
    {#if (source.engineering_team?.length ?? 0) > 0}
     <span class="stat-tag">{source.engineering_team?.length ?? 0} analyses</span>
    {/if}
    {#if (source.research?.length ?? 0) > 0}
     <span class="stat-tag">{source.research?.length ?? 0} research</span>
    {/if}
    {#if (source.pdf?.length ?? 0) > 0}
     <span class="stat-tag">{source.pdf?.length ?? 0} PDFs</span>
    {/if}
   </div>
   <div class="sort-toggle">
    <button class:active={sortMode === "date"} onclick={() => sortMode = "date"}>Recent</button>
    <button class:active={sortMode === "alpha"} onclick={() => sortMode = "alpha"}>A–Z</button>
   </div>
  </div>

  {#if source.root_docs.length > 0}
   <section>
    <h2>Root Docs</h2>
    <ul class="doc-list">
     {#each sortDocs(source.root_docs) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}

  {#if source.docs.length > 0}
   <section>
    <h2><a href="/source/{encodeURIComponent(source.source)}/docs">Documentation</a></h2>
    <ul class="doc-list">
     {#each sortDocs(source.docs) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}

  {#if source.journal.length > 0}
   <section>
    <h2><a href="/source/{encodeURIComponent(source.source)}/journal">Development Journal</a></h2>
    <ul class="doc-list">
     {#each sortDocs(source.journal) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}

  {#if (source.learning_journal?.length ?? 0) > 0}
   <section>
    <h2><a href="/source/{encodeURIComponent(source.source)}/learning_journal">Learning Journal</a></h2>
    <ul class="doc-list">
     {#each sortDocs(source.learning_journal ?? []) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}

  {#if (source.engineering_team?.length ?? 0) > 0}
   <section>
    <h2><a href="/source/{encodeURIComponent(source.source)}/engineering_team">Engineering Team</a></h2>
    <ul class="doc-list">
     {#each sortDocs(source.engineering_team ?? []) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}

  {#if (source.research?.length ?? 0) > 0}
   <section>
    <h2><a href="/source/{encodeURIComponent(source.source)}/research">Research</a></h2>
    <ul class="doc-list">
     {#each sortDocs(source.research ?? []) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}

  {#if (source.pdf?.length ?? 0) > 0}
   <section>
    <h2><a href="/source/{encodeURIComponent(source.source)}/pdf">PDF</a></h2>
    <ul class="doc-list">
     {#each sortDocs(source.pdf ?? []) as doc}
      <li>
       <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
       <span class="dates">
        {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
        {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
       </span>
      </li>
     {/each}
    </ul>
   </section>
  {/if}
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
 section {
  margin-bottom: 30px;
 }
 h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
 }
 h2 a {
  color: var(--text);
  text-decoration: none;
 }
 h2 a:hover {
  color: var(--text);
  text-decoration: underline;
 }
 .doc-list {
  list-style: none;
 }
 .doc-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
 }
 .doc-list a {
  color: var(--link);
  font-size: 16px;
  font-weight: 600;
 }
 .doc-list a:hover {
  color: var(--link-hover);
 }
 .dates {
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
  margin-left: 15px;
  gap: 10px;
 }

 .date {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
 }

 .date.created {
  color: var(--text-muted);
  font-size: 13px;
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
  .dates {
   align-items: flex-start;
   margin-left: 0;
  }
  .date {
   font-size: 14px;
  }
  .date.created {
   font-size: 13px;
  }
 }
</style>
