<script lang="ts">
 import { fetchTree, type TreeDocument } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";

 interface JournalEntry extends TreeDocument {
  source: string;
 }

 let entries: JournalEntry[] = $state([]);
 let loading = $state(true);
 let error = $state("");

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
    const da = a.created_at || a.modified_at || "";
    const db = b.created_at || b.modified_at || "";
    return db.localeCompare(da);
   });
   entries = all;
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 import { displayTitle } from "$lib/titles";

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

 // Group entries by month/year for timeline sections
 function monthKey(dateStr: string | null): string {
  if (!dateStr) return "Unknown date";
  try {
   return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
   });
  } catch {
   return "Unknown date";
  }
 }

 let groupedEntries = $derived.by(() => {
  const groups: { month: string; entries: JournalEntry[] }[] = [];
  let currentMonth = "";
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
 <div class="status">
  <p class="error">{error}</p>
  <a href="/">Back to home</a>
 </div>
{:else}
 <div class="masthead">
  <div class="masthead__inner">
   <h1 class="masthead__title">Journal Timeline</h1>
   <p class="masthead__description">
    All development journal entries across {new Set(entries.map((e) => e.source)).size} projects &middot; {entries.length} entries
   </p>
  </div>
 </div>

 <div class="journal-page">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
   <a href="/">Home</a>
   <span class="sep">/</span>
   <span class="current">Journal Timeline</span>
  </nav>

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
          <div>
           <span class="entry-title">{displayTitle(entry)}</span>
           <span
            class="entry-source {sourceColorClass(entry.source)}"
            >{entry.source}</span
           >
          </div>
          <span class="entry-date">{formatDate(entry.created_at || entry.modified_at)}</span>
         </div>
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

 .journal-page {
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
  line-height: 1.25;
  flex-wrap: wrap;
  margin-bottom: 30px;
 }

 .breadcrumbs a {
  color: var(--text);
  text-decoration: none;
  transition: color 0.1s;
 }

 .breadcrumbs a:hover {
  color: var(--text);
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
  font-weight: normal;
 }


 .empty {
  color: var(--text-muted);
  font-style: italic;
 }

 .timeline {
  display: flex;
  flex-direction: column;
  gap: 25px;
 }

 .month-header {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 10px;
 }

 .entries {
  display: flex;
  flex-direction: column;
  gap: 5px;
 }

 .entry-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 15px;
  border-radius: 0;
  text-decoration: none;
  transition: background 0.15s, border-left-color 0.15s;
  border-left: 3px solid transparent;
 }

 .entry-card:hover {
  background: var(--bg-surface);
  border-left-color: var(--brand);
 }

 .entry-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 15px;
 }

 .entry-title {
  color: var(--text);
  font-size: 19px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
 }

 .entry-date {
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
 }

 .entry-source {
  font-size: 16px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 0;
  width: fit-content;
  white-space: nowrap;
 }

 @media (max-width: 640px) {
  h1 {
   font-size: 32px;
  }
  .breadcrumbs {
   font-size: 16px;
  }
  .breadcrumbs a {
   padding: 5px;
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }
  .month-header {
   font-size: 21px;
   font-weight: 700;
  }
  .entry-header {
   flex-direction: column;
   gap: 5px;
  }
  .entry-title {
   font-size: 16px;
  }
  .entry-date {
   order: -1;
   font-size: 14px;
  }
  .entry-source {
   font-size: 16px;
   padding: 2px 8px;
  }
  .entry-card {
   min-height: 44px;
   padding: 10px 15px;
  }
 }
</style>
