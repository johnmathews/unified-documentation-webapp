<script lang="ts">
 import { listBookmarks, type BookmarkEntry, type DocType } from "$lib/api";
 import BookmarkButton from "$lib/components/BookmarkButton.svelte";
 import { currentDocId } from "$lib/stores.svelte";
 import { displayTitle, displaySource } from "$lib/titles";
 import { SvelteMap } from "svelte/reactivity";

 let bookmarks: BookmarkEntry[] = $state([]);
 let loading = $state(true);
 let error = $state("");

 // Track removals locally so we can hide them immediately
 let removedIds = $state(new Set<string>());

 let visibleBookmarks = $derived(bookmarks.filter((b) => !removedIds.has(b.doc_id)));

 $effect(() => {
  currentDocId.value = null;
  loadBookmarks();
 });

 async function loadBookmarks() {
  try {
   bookmarks = await listBookmarks();
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load bookmarks";
  } finally {
   loading = false;
  }
 }

 // Group bookmarks by source, then by document type. Bookmarks predating
 // Stage 2 may not carry a `type` yet — fall back to "documentation" so they
 // group under a known heading rather than a sentinel.
 interface GroupedCategory {
  category: DocType;
  label: string;
  entries: BookmarkEntry[];
 }

 interface GroupedSource {
  source: string;
  categories: GroupedCategory[];
 }

 const typeLabels: Record<DocType, string> = {
  documentation: "Documentation",
  journal: "Journal",
  prompt: "Prompt",
  "not-docs": "Not docs",
 };

 let grouped = $derived.by(() => {
  const bySource = new SvelteMap<string, SvelteMap<DocType, BookmarkEntry[]>>();

  for (const bm of visibleBookmarks) {
   const source = bm.source || "unknown";
   const cat: DocType = bm.type ?? "documentation";

   if (!bySource.has(source)) bySource.set(source, new SvelteMap());
   const cats = bySource.get(source)!;
   if (!cats.has(cat)) cats.set(cat, []);
   cats.get(cat)!.push(bm);
  }

  const result: GroupedSource[] = [];
  for (const [source, cats] of [...bySource.entries()].sort((a, b) =>
   displaySource(a[0]).localeCompare(displaySource(b[0])),
  )) {
   const categories: GroupedCategory[] = [];
   for (const [cat, entries] of [...cats.entries()].sort((a, b) =>
    typeLabels[a[0]].localeCompare(typeLabels[b[0]]),
   )) {
    categories.push({
     category: cat,
     label: typeLabels[cat],
     entries: entries.sort((a, b) =>
      (a.title || "").localeCompare(b.title || ""),
     ),
    });
   }
   result.push({ source, categories });
  }
  return result;
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

 function handleRemove(docId: string, bookmarked: boolean) {
  if (!bookmarked) {
   removedIds = new Set([...removedIds, docId]);
  }
 }
</script>

<svelte:head>
 <title>Bookmarks - Documentation Library</title>
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
   <h1 class="masthead__title">Bookmarks</h1>
   <p class="masthead__description">{visibleBookmarks.length} bookmarked document{visibleBookmarks.length === 1 ? "" : "s"}.</p>
  </div>
 </div>

 <div class="bookmarks-page">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
   <a href="/">Home</a>
   <span class="sep">/</span>
   <span class="current">Bookmarks</span>
  </nav>

  {#if visibleBookmarks.length === 0}
   <p class="empty">No bookmarked documents yet. Use the bookmark icon on any document to save it here.</p>
  {:else}
   {#each grouped as group (group.source)}
    <section class="source-group">
     <h2 class="source-header">{displaySource(group.source)}</h2>
     {#each group.categories as cat (cat.category)}
      <div class="category-group">
       <h3 class="category-header">{cat.label}</h3>
       <ul class="doc-list">
        {#each cat.entries as entry (entry.doc_id)}
         <li>
          <BookmarkButton docId={entry.doc_id} bookmarked={true} size="small" onToggle={(val) => handleRemove(entry.doc_id, val)} />
          {#if entry.bookmarked_at}
           <span class="date">{formatDate(entry.bookmarked_at)}</span>
          {/if}
          <a class="entry-title" href={docUrl(entry.doc_id)}>{displayTitle({ title: entry.title, file_path: entry.file_path || "", source: entry.source || undefined })}</a>
         </li>
        {/each}
       </ul>
      </div>
     {/each}
    </section>
   {/each}
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

 .bookmarks-page {
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

 .source-group {
  margin-bottom: 35px;
 }

 .source-header {
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  color: var(--text);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 10px;
 }

 .category-group {
  margin-bottom: 20px;
 }

 .category-header {
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 5px;
 }

 .doc-list {
  list-style: none;
 }

 .doc-list li {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  min-height: 44px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  gap: 15px;
 }

 .entry-title {
  color: var(--link);
  font-size: 19px;
  line-height: 25px;
  min-width: 0;
  flex: 1;
 }

 .date {
  font-size: 16px;
  line-height: 20px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
 }

 @media (max-width: 640px) {
  .source-header {
   font-size: 21px;
   line-height: 25px;
  }
  .doc-list li {
   gap: 10px;
   padding: 10px 0;
  }
  .entry-title {
   font-size: 16px;
   line-height: 20px;
   flex-basis: 100%;
  }
 }
</style>
