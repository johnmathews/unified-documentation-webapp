<script lang="ts">
 import { page } from "$app/state";
 import { fetchTree, type TreeDocument } from "$lib/api";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import { currentDocId } from "$lib/stores.svelte";
 import { displayTitle, displaySource } from "$lib/titles";

 let docs: TreeDocument[] = $state([]);
 let loading = $state(true);
 let error = $state("");

 type SortMode = "date" | "alpha";
 let sortMode: SortMode = $state("date");

 let sourceName = $derived(decodeURIComponent(page.params.name ?? ""));
 let category = $derived(page.params.category ?? "");

 $effect(() => {
  currentDocId.value = null;
  loadCategory(sourceName, category);
 });

 async function loadCategory(name: string, cat: string) {
  loading = true;
  error = "";
  try {
   const tree = await fetchTree();
   const source = tree.find((s) => s.source === name);
   if (!source) {
    error = `Source "${name}" not found`;
    return;
   }
   if (cat === "docs") docs = source.docs;
   else if (cat === "journal") docs = source.journal;
   else if (cat === "learning_journal") docs = source.learning_journal ?? [];
   else if (cat === "engineering_team") docs = source.engineering_team ?? [];
   else if (cat === "research") docs = source.research ?? [];
   else if (cat === "pdf") docs = source.pdf ?? [];
   else {
    error = `Unknown category "${cat}"`;
    return;
   }
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 let sortedDocs = $derived.by(() => {
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
 });

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

 let categoryLabel = $derived(
  category === "journal"
   ? "Development Journal"
   : category === "learning_journal"
     ? "Learning Journal"
     : category === "engineering_team"
       ? "Engineering Team"
       : category === "research"
         ? "Research"
         : category === "pdf"
           ? "PDF"
           : "Documentation",
 );
</script>

<svelte:head>
 <title>{categoryLabel} - {displaySource(sourceName)} - Documentation Library</title>
</svelte:head>

{#if loading}
 <div class="status"><p>Loading...</p></div>
{:else if error}
 <div class="status">
  <p class="error">{error}</p>
  <a href="/">Back to home</a>
 </div>
{:else}
 <div class="category-page">
  <Breadcrumbs source={sourceName} {category} />
  <h1>{categoryLabel}</h1>
  <div class="controls-row">
   <p class="subtitle">
    {displaySource(sourceName)} &middot; {docs.length}
    {docs.length === 1 ? "document" : "documents"}
   </p>
   <div class="sort-toggle">
    <button class:active={sortMode === "date"} onclick={() => sortMode = "date"}>Recent</button>
    <button class:active={sortMode === "alpha"} onclick={() => sortMode = "alpha"}>A–Z</button>
   </div>
  </div>

  {#if docs.length === 0}
   <p class="empty">No documents in this category.</p>
  {:else}
   <ul class="doc-list">
    {#each sortedDocs as doc}
     <li>
      <a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a>
      <span class="dates">
       {#if doc.modified_at}<span class="date">{formatDate(doc.modified_at)}</span>{/if}
       {#if doc.created_at && doc.created_at !== doc.modified_at}<span class="date created">{formatDate(doc.created_at)}</span>{/if}
      </span>
     </li>
    {/each}
   </ul>
  {/if}
 </div>
{/if}

<style>
 .category-page {
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

 .subtitle {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
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

 .empty {
  color: var(--text-muted);
  font-style: italic;
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
