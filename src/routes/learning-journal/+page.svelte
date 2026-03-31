<script lang="ts">
 import { fetchTree, type TreeDocument } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";
 import { displayTitle, displaySource } from "$lib/titles";

 interface LearningEntry extends TreeDocument {
  source: string;
 }

 let allEntries: LearningEntry[] = $state([]);
 let sources: string[] = $state([]);
 let activeSource: string | null = $state(null);
 let loading = $state(true);
 let error = $state("");

 let entries = $derived(
  activeSource ? allEntries.filter((e) => e.source === activeSource) : allEntries,
 );

 $effect(() => {
  currentDocId.value = null;
  loadEntries();
 });

 async function loadEntries() {
  try {
   const tree = await fetchTree();
   const all: LearningEntry[] = [];
   const srcSet = new Set<string>();
   for (const source of tree) {
    for (const doc of source.learning_journal ?? []) {
     all.push({ ...doc, source: source.source });
     srcSet.add(source.source);
    }
   }
   all.sort((a, b) => {
    const da = a.created_at || a.modified_at || "";
    const db = b.created_at || b.modified_at || "";
    return db.localeCompare(da);
   });
   allEntries = all;
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

 function formatDay(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
   return new Date(dateStr).getDate().toString();
  } catch {
   return dateStr;
  }
 }

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
  const groups: { month: string; entries: LearningEntry[] }[] = [];
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
 <title>Learning Journal - Documentation Library</title>
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
   <h1 class="masthead__title">Learning Journal</h1>
   <p class="masthead__description">{entries.length} learning entries{activeSource ? ` from ${displaySource(activeSource)}` : " across all projects"}.</p>
  </div>
 </div>

 <div class="journal-page">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
   <a href="/">Home</a>
   <span class="sep">/</span>
   <span class="current">Learning Journal</span>
  </nav>

  {#if sources.length > 1}
   <div class="source-filters">
    <button class="filter-btn" class:active={activeSource === null} onclick={() => activeSource = null}>All</button>
    {#each sources as src}
     <button class="filter-btn {sourceColorClass(src)}" class:active={activeSource === src} onclick={() => activeSource = activeSource === src ? null : src}>{displaySource(src)}</button>
    {/each}
   </div>
  {/if}

  {#if entries.length === 0}
   <p class="empty">No learning journal entries found{activeSource ? ` for ${displaySource(activeSource)}` : ""}.</p>
  {:else}
   <div class="timeline">
    {#each groupedEntries as group}
     <div class="month-group">
      <h2 class="month-header">{group.month}</h2>
      <div class="entries">
       {#each group.entries as entry, i}
        {@const day = formatDay(entry.created_at || entry.modified_at)}
        {@const prevDay = i > 0 ? formatDay(group.entries[i - 1].created_at || group.entries[i - 1].modified_at) : ""}
        <a href={docUrl(entry.doc_id)} class="entry-card">
         <div class="entry-header">
          <span class="entry-date" class:invisible={day === prevDay}>{day}</span>
          <span class="entry-source {sourceColorClass(entry.source)}">{displaySource(entry.source)}</span>
          <span class="entry-title">{displayTitle(entry)}</span>
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
  font-weight: normal;
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
  padding: 10px 0;
  text-decoration: none;
  border-left: 3px solid transparent;
 }

 .entry-card:hover {
  background: var(--bg-surface);
  border-left-color: var(--brand);
 }

 .entry-header {
  display: flex;
  align-items: baseline;
  gap: 15px;
 }

 .entry-date {
  font-size: 16px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 1.5em;
 }

 .entry-date.invisible {
  visibility: hidden;
 }

 .entry-source {
  font-size: 16px;
  font-weight: bold;
  padding: 2px 8px;
  white-space: nowrap;
  flex-shrink: 0;
 }

 .entry-title {
  color: var(--text);
  font-size: 19px;
  font-weight: 500;
  min-width: 0;
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
