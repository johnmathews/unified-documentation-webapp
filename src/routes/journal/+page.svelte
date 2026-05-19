<script lang="ts">
 import { fetchAllSourcesTree } from "$lib/api";
 import {
  sortJournalEntries,
  groupEntriesByMonth,
  formatDay,
  type JournalEntry,
 } from "$lib/journal";
 import { displayTitle, displaySource } from "$lib/titles";
 import { currentDocId } from "$lib/stores.svelte";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import { SvelteSet } from "svelte/reactivity";

 let allEntries: JournalEntry[] = $state([]);
 let sources: string[] = $state([]);
 let activeSource: string | null = $state(null);
 let loading = $state(true);
 let error = $state("");

 let visibleEntries = $derived(
  activeSource ? allEntries.filter((e) => e.source === activeSource) : allEntries,
 );

 let grouped = $derived(groupEntriesByMonth(visibleEntries));

 $effect(() => {
  currentDocId.value = null;
  void loadJournal();
 });

 async function loadJournal() {
  try {
   const tree = await fetchAllSourcesTree();
   const all: JournalEntry[] = [];
   const srcSet = new SvelteSet<string>();
   for (const src of tree.sources) {
    for (const f of src.files) {
     if (f.type === "journal") {
      all.push({ ...f, source: src.source });
      srcSet.add(src.source);
     }
    }
   }
   allEntries = sortJournalEntries(all);
   sources = [...srcSet].sort((a, b) =>
    displaySource(a).localeCompare(displaySource(b)),
   );
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load journal";
  } finally {
   loading = false;
  }
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 function entryDate(entry: JournalEntry): string | null {
  return entry.created_at || entry.modified_at;
 }
</script>

<svelte:head>
 <title>Journal - Documentation Library</title>
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
   <h1 class="masthead__title">Journal</h1>
   <p class="masthead__description">
    {visibleEntries.length} journal {visibleEntries.length === 1 ? "entry" : "entries"}{activeSource
     ? ` from ${displaySource(activeSource)}`
     : sources.length > 0
      ? ` across ${sources.length} project${sources.length === 1 ? "" : "s"}`
      : ""}.
   </p>
  </div>
 </div>

 <div class="journal-page">
  <Breadcrumbs crumbs={[{ label: "Journal" }]} />

  {#if sources.length > 1}
   <div class="source-filters" role="group" aria-label="Filter by project">
    <button
     type="button"
     class="filter-btn"
     class:active={activeSource === null}
     aria-pressed={activeSource === null}
     onclick={() => (activeSource = null)}>All</button>
    {#each sources as src (src)}
     <button
      type="button"
      class="filter-btn"
      class:active={activeSource === src}
      aria-pressed={activeSource === src}
      onclick={() => (activeSource = activeSource === src ? null : src)}>{displaySource(src)}</button>
    {/each}
   </div>
  {/if}

  {#if visibleEntries.length === 0}
   <p class="empty">
    No journal entries{activeSource ? ` for ${displaySource(activeSource)}` : ""}.
   </p>
  {:else}
   <div class="timeline">
    {#each grouped as group (group.month)}
     <section class="month-group" aria-labelledby="m-{group.month}">
      <h2 id="m-{group.month}" class="month-header">{group.month}</h2>
      <ol class="entries">
       {#each group.entries as entry, i (entry.doc_id)}
        {@const day = formatDay(entryDate(entry))}
        {@const prevDay = i > 0 ? formatDay(entryDate(group.entries[i - 1])) : ""}
        <li class="entry">
         <span class="entry-date" aria-hidden={day === prevDay}>
          {day === prevDay ? "" : day}
         </span>
         {#if !activeSource}
          <span class="entry-source">{displaySource(entry.source)}</span>
         {/if}
         <a class="entry-title" href={docUrl(entry.doc_id)}>
          {displayTitle({
           title: entry.title,
           file_path: entry.file_path,
           source: entry.source,
          })}
         </a>
        </li>
       {/each}
      </ol>
     </section>
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
  max-width: 720px;
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

 .source-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 25px;
 }

 .filter-btn {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 4px 12px;
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
  background: var(--stat-tag-bg, rgba(128, 128, 128, 0.15));
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-radius: 0;
  cursor: pointer;
 }

 .filter-btn:hover {
  border-color: var(--border);
 }

 /* Refines canonical :focus-visible (app.css) — applies GOV.UK yellow-fill
    to the filter button (coloured toggle needs fill, not just outline). */
 .filter-btn:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  background: var(--focus);
  color: var(--focus-text);
 }

 .filter-btn.active {
  background: var(--brand);
  color: #ffffff;
  border-color: var(--brand);
 }

 .empty {
  color: var(--text-muted);
  font-style: italic;
 }

 .timeline {
  display: flex;
  flex-direction: column;
  gap: 30px;
 }

 .month-group {
  display: flex;
  flex-direction: column;
 }

 .month-header {
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  color: var(--text);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 10px;
 }

 .entries {
  list-style: none;
  padding: 0;
  margin: 0;
 }

 .entry {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 15px;
  min-height: 44px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
 }

 .entry-date {
  font-size: 16px;
  line-height: 20px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 1.5em;
  text-align: right;
 }

 .entry-source {
  font-size: 16px;
  line-height: 20px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
 }

 .entry-title {
  color: var(--link);
  font-size: 19px;
  line-height: 25px;
  font-weight: 400;
  text-decoration: underline;
  text-decoration-thickness: max(1px, 0.0625rem);
  text-underline-offset: 0.1578em;
  min-width: 0;
  flex: 1;
 }

 .entry-title:visited {
  color: var(--link-visited);
 }

 .entry-title:hover {
  color: var(--link-hover);
  text-decoration-thickness: max(3px, 0.1875rem, 0.12em);
 }

 @media (max-width: 640px) {
  .month-header {
   font-size: 21px;
   line-height: 25px;
  }

  .entry {
   gap: 10px;
   padding: 10px 0;
  }

  .entry-title {
   font-size: 16px;
   line-height: 20px;
   flex-basis: 100%;
  }

  .entry-source {
   order: -1;
  }
 }
</style>
