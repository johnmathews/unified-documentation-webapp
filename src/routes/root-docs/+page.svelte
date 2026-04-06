<script lang="ts">
 import { fetchTree, type TreeDocument } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { displayTitle, displaySource } from "$lib/titles";

 interface RootDoc extends TreeDocument {
  source: string;
 }

 let docs: RootDoc[] = $state([]);
 let sources: string[] = $state([]);
 let activeSource: string | null = $state(null);
 let loading = $state(true);
 let error = $state("");

 type SortMode = "edited" | "created" | "alpha";
 let sortMode: SortMode = $state("edited");

 $effect(() => {
  currentDocId.value = null;
  loadDocs();
 });

 async function loadDocs() {
  try {
   const tree = await fetchTree();
   const all: RootDoc[] = [];
   const srcSet = new Set<string>();
   for (const source of tree) {
    if (source.root_docs.length > 0) srcSet.add(source.source);
    for (const doc of source.root_docs) {
     all.push({ ...doc, source: source.source });
    }
   }
   all.sort((a, b) => {
    const sa = a.source.localeCompare(b.source);
    if (sa !== 0) return sa;
    return (a.title || a.file_path).localeCompare(b.title || b.file_path);
   });
   docs = all;
   sources = [...srcSet].sort((a, b) => displaySource(a).localeCompare(displaySource(b)));
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
   return new Date(dateStr).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  } catch {
   return dateStr;
  }
 }

 function sortDocs(list: RootDoc[]): RootDoc[] {
  const copy = [...list];
  if (sortMode === "alpha") {
   copy.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
  } else if (sortMode === "created") {
   copy.sort((a, b) => {
    const da = a.created_at ?? "";
    const db = b.created_at ?? "";
    return db.localeCompare(da);
   });
  } else {
   copy.sort((a, b) => {
    const da = a.modified_at ?? a.created_at ?? "";
    const db = b.modified_at ?? b.created_at ?? "";
    return db.localeCompare(da);
   });
  }
  return copy;
 }

 let filteredDocs = $derived(
  activeSource ? docs.filter((d) => d.source === activeSource) : docs,
 );

 let groupedDocs = $derived.by(() => {
  const groups: { source: string; docs: RootDoc[] }[] = [];
  let currentSource = "";
  for (const doc of filteredDocs) {
   if (doc.source !== currentSource) {
    currentSource = doc.source;
    groups.push({ source: doc.source, docs: [] });
   }
   groups[groups.length - 1].docs.push(doc);
  }
  return groups;
 });
</script>

<svelte:head>
 <title>Root Docs - Documentation Library</title>
</svelte:head>

{#if loading}
 <div class="status"><p>Loading...</p></div>
{:else if error}
 <div class="status">
  <p class="error">{error}</p>
  <a href="/">Back to home</a>
 </div>
{:else}
 <div class="masthead">
  <div class="masthead__inner">
   <h1 class="masthead__title">Root Docs</h1>
   <p class="masthead__description">{filteredDocs.length} root files{activeSource ? ` from ${displaySource(activeSource)}` : " across all projects"}.</p>
  </div>
 </div>

 <div class="page-content">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
   <a href="/">Home</a>
   <span class="sep">/</span>
   <span class="current">Root Docs</span>
  </nav>

  <div class="controls-row">
   {#if sources.length > 1}
    <div class="source-filters">
     <button class="filter-btn" class:active={activeSource === null} onclick={() => activeSource = null}>All</button>
     {#each sources as src}
      <button class="filter-btn" class:active={activeSource === src} onclick={() => activeSource = activeSource === src ? null : src}>{displaySource(src)}</button>
     {/each}
    </div>
   {/if}
   <div class="sort-toggle">
    <button class:active={sortMode === "edited"} onclick={() => sortMode = "edited"}>Edited</button>
    <button class:active={sortMode === "created"} onclick={() => sortMode = "created"}>Created</button>
    <button class:active={sortMode === "alpha"} onclick={() => sortMode = "alpha"}>A–Z</button>
   </div>
  </div>

  {#if filteredDocs.length === 0}
   <p class="empty">No root documents found{activeSource ? ` for ${displaySource(activeSource)}` : ""}.</p>
  {:else}
   <div class="doc-groups">
    {#each groupedDocs as group}
     <div class="source-group">
      <h2 class="source-header">
       <span class="source-tag">{displaySource(group.source)}</span>
      </h2>
      <ul class="doc-list">
       {#each sortDocs(group.docs) as doc}
        <li>
         <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
         <span class="dates">
          {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
          {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
         </span>
        </li>
       {/each}
      </ul>
     </div>
    {/each}
   </div>
  {/if}
 </div>
{/if}

<style>
 .masthead {
  padding: 30px 0;
  border-bottom: 1px solid var(--brand-dark);
  color: #ffffff;
  background-color: var(--brand);
  margin: -40px -30px 0;
  padding-left: 30px;
  padding-right: 30px;
 }

 @media (min-width: 641px) {
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

 @media (min-width: 641px) {
  .masthead__title {
   font-size: 3rem;
   line-height: 1.0416666667;
  }
 }

 .masthead__description {
  color: #ffffff;
  font-size: 1.1875rem;
  line-height: 1.3157894737;
  margin-bottom: 0;
 }

 @media (min-width: 641px) {
  .masthead__description {
   font-size: 1.5rem;
   line-height: 1.25;
  }
 }

 @media (max-width: 640px) {
  .masthead {
   margin: -20px -15px 0;
   padding-left: 15px;
   padding-right: 15px;
  }
 }

 .page-content {
  max-width: 960px;
  margin: 0 auto;
  padding-top: 30px;
 }

 .status {
  padding: 60px;
  text-align: center;
  color: var(--text-secondary);
 }

 .error {
  color: var(--error);
 }

 .breadcrumbs {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  flex-wrap: wrap;
  margin-bottom: 30px;
 }

 .breadcrumbs a {
  color: var(--text);
  text-decoration: none;
 }
 .breadcrumbs a:hover {
  text-decoration: underline;
 }
 .breadcrumbs a:visited {
  color: var(--text);
 }
 .sep {
  color: var(--text-secondary);
 }
 .current {
  color: var(--text);
 }
 .source-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 25px;
 }

 .filter-btn {
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 600;
  background: var(--stat-tag-bg, rgba(128, 128, 128, 0.15));
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
 }

 .filter-btn:hover {
  border-color: var(--border);
 }

 .filter-btn.active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
 }

 .empty {
  color: var(--text-muted);
  font-style: italic;
 }

 .doc-groups {
  display: flex;
  flex-direction: column;
  gap: 25px;
 }

 .source-header {
  font-size: 24px;
  font-weight: 700;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 10px;
 }

 .source-tag {
  font-weight: bold;
 }

 .controls-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
  gap: 12px;
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
  border-right: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
 }

 .sort-toggle button:last-child {
  border-right: none;
 }

 .sort-toggle button.active {
  background: var(--brand);
  color: #fff;
 }

 .sort-toggle button:hover:not(.active) {
  background: var(--stat-tag-bg, rgba(128, 128, 128, 0.15));
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
  .controls-row {
   flex-direction: column;
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
   margin-left: 0;
  }
 }
</style>
