<script lang="ts">
 import { fetchTree, type TreeDocument } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";
 import { displayTitle, displaySource } from "$lib/titles";

 interface RootDoc extends TreeDocument {
  source: string;
 }

 let docs: RootDoc[] = $state([]);
 let loading = $state(true);
 let error = $state("");

 $effect(() => {
  currentDocId.value = null;
  loadDocs();
 });

 async function loadDocs() {
  try {
   const tree = await fetchTree();
   const all: RootDoc[] = [];
   for (const source of tree) {
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
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 let groupedDocs = $derived.by(() => {
  const groups: { source: string; docs: RootDoc[] }[] = [];
  let currentSource = "";
  for (const doc of docs) {
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
 <title>Root Docs - Documentation</title>
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
   <p class="masthead__description">
    Project root files (README, CLAUDE.md) across {new Set(docs.map((d) => d.source)).size} projects &middot; {docs.length} documents
   </p>
  </div>
 </div>

 <div class="page-content">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
   <a href="/">Home</a>
   <span class="sep">/</span>
   <span class="current">Root Docs</span>
  </nav>

  {#if docs.length === 0}
   <p class="empty">No root documents found.</p>
  {:else}
   <div class="doc-groups">
    {#each groupedDocs as group}
     <div class="source-group">
      <h2 class="source-header">
       <span class="source-tag {sourceColorClass(group.source)}">{displaySource(group.source)}</span>
      </h2>
      <div class="doc-list">
       {#each group.docs as doc}
        <a href={docUrl(doc.doc_id)} class="doc-card">
         <span class="doc-title">{displayTitle(doc)}</span>
         <span class="doc-path">{doc.file_path}</span>
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
  .masthead { padding-top: 60px; padding-bottom: 60px; }
 }

 .masthead__inner { max-width: 960px; margin: 0 auto; }

 .masthead__title {
  color: #ffffff;
  font-size: 2rem;
  line-height: 1.09375;
  font-weight: 700;
  margin-bottom: 15px;
 }

 @media (min-width: 641px) {
  .masthead__title { font-size: 3rem; line-height: 1.0416666667; }
 }

 .masthead__description {
  color: #ffffff;
  font-size: 1.1875rem;
  line-height: 1.3157894737;
  margin-bottom: 0;
 }

 @media (min-width: 641px) {
  .masthead__description { font-size: 1.5rem; line-height: 1.25; }
 }

 @media (max-width: 640px) {
  .masthead { margin: -20px -15px 0; padding-left: 15px; padding-right: 15px; }
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

 .error { color: var(--error); }

 .breadcrumbs {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  flex-wrap: wrap;
  margin-bottom: 30px;
 }

 .breadcrumbs a { color: var(--text); text-decoration: none; }
 .breadcrumbs a:hover { text-decoration: underline; }
 .breadcrumbs a:visited { color: var(--text); }
 .sep { color: var(--text-secondary); }
 .current { color: var(--text); }
 .empty { color: var(--text-muted); font-style: italic; }

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
  font-size: 16px;
  font-weight: bold;
  padding: 2px 8px;
 }

 .doc-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
 }

 .doc-card {
  display: flex;
  align-items: baseline;
  gap: 15px;
  padding: 12px 15px;
  text-decoration: none;
  color: var(--text);
  border-left: 4px solid transparent;
  transition: all 0.1s;
 }

 .doc-card:hover {
  background: var(--bg-hover);
  border-left-color: var(--brand);
 }

 .doc-card:visited { color: var(--text); }

 .doc-title {
  font-size: 19px;
  font-weight: 700;
 }

 .doc-path {
  font-size: 14px;
  color: var(--text-muted);
  font-family: var(--font-mono);
 }

 @media (max-width: 640px) {
  .doc-card {
   flex-direction: column;
   gap: 4px;
   padding: 15px;
   min-height: 44px;
  }
  .doc-title { font-size: 16px; }
  .doc-path { font-size: 14px; }
 }
</style>
