<script lang="ts">
 import { page } from "$app/state";
 import { fetchDocument, checkBookmarks, type FullDocument } from "$lib/api";
 import { currentDocId, currentDocToc, tocOpen } from "$lib/stores.svelte";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import BookmarkButton from "$lib/components/BookmarkButton.svelte";
 import FloatingDocControls from "$lib/components/FloatingDocControls.svelte";
 import DocToc from "$lib/components/DocToc.svelte";
 import HighlightPopover from "$lib/components/HighlightPopover.svelte";
 import { displaySource, displayTitle, stripSourcePrefix } from "$lib/titles";
 import { renderMarkdownWithLinks, extractHeadings } from "$lib/links";
 import { countDocStats } from "$lib/docStats";
 import { applyHighlights, loadHighlights } from "$lib/highlights";

 let doc: FullDocument | null = $state(null);
 let loading = $state(true);
 let error = $state("");
 let isBookmarked = $state(false);
 let mdEl = $state<HTMLElement | null>(null);

 let currentId = $derived(decodeURIComponent(page.params.id ?? ""));
 let stats = $derived.by(() => {
  if (!doc || !doc.content) return null;
  return countDocStats(doc.content);
 });

 $effect(() => {
  const id = currentId;
  currentDocId.value = id;
  loadDocument(id);

  return () => {
   // Clean up when leaving
   if (currentDocId.value === id) {
    currentDocId.value = null;
   }
   currentDocToc.value = [];
  };
 });

 async function loadDocument(docId: string) {
  loading = true;
  error = "";
  doc = null;
  currentDocToc.value = [];

  try {
   doc = await fetchDocument(docId);
   if (doc.content && !doc.file_path.toLowerCase().endsWith(".pdf")) {
    currentDocToc.value = extractHeadings(doc.content);
   }
   // Check bookmark status
   const status = await checkBookmarks([docId]);
   isBookmarked = status[docId] ?? false;
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load document";
  } finally {
   loading = false;
  }
 }

 function isPdf(doc: FullDocument): boolean {
  return doc.file_path.toLowerCase().endsWith(".pdf");
 }

 function pdfUrl(docId: string): string {
  return `/api/files/${encodeURIComponent(docId)}`;
 }

 function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
   return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
   });
  } catch {
   return dateStr;
  }
 }

 $effect(() => {
  // Depend on both the bound element and the content string so this fires
  // exactly once after the markdown lands in the DOM, and again when the
  // doc switches.
  const root = mdEl;
  const content = doc?.content;
  const docId = doc?.doc_id;
  if (!root || !content || !docId) return;
  applyHighlights(root, loadHighlights(docId));
 });
</script>

<svelte:head>
 <title>{doc ? displayTitle(doc) : "Document"} - Documentation Library</title>
</svelte:head>

{#if loading}
 <div class="status-page">
  <div class="spinner"></div>
  <p>Loading document...</p>
 </div>
{:else if error}
 <div class="status-page">
  <p class="error">{error}</p>
  <a href="/">Back to home</a>
 </div>
{:else if doc}
 <div class="doc-layout" class:has-toc={!isPdf(doc) && !!doc.content && tocOpen.value && currentDocToc.value.length > 0}>
  <article class="document">
   <Breadcrumbs
    source={doc.source}
    category={doc.file_path.toLowerCase().endsWith(".pdf")
     ? "pdf"
     : doc.file_path.includes("journal/")
       ? "journal"
       : doc.file_path.includes(".engineering-team/")
         ? "engineering_team"
         : "docs"}
    title={doc.title ? stripSourcePrefix(doc.title, doc.source) : doc.file_path.split("/").pop() || doc.file_path}
   />
   <header class="doc-header">
    <div class="doc-meta-row">
     <BookmarkButton docId={doc.doc_id} bind:bookmarked={isBookmarked} />
     <a href="/source/{encodeURIComponent(doc.source)}" class="source-badge">{displaySource(doc.source)}</a>
     <span class="file-path">{doc.file_path}</span>
    </div>
    {#if doc.created_at || doc.modified_at || stats}
     <div class="doc-dates-row">
      {#if doc.created_at}
       <span>Created: {formatDate(doc.created_at)}</span>
      {/if}
      {#if doc.modified_at}
       <span>Modified: {formatDate(doc.modified_at)}</span>
      {/if}
      {#if stats}
       <span>Words: {stats.words.toLocaleString()}</span>
       <span>Lines: {stats.lines.toLocaleString()}</span>
      {/if}
     </div>
    {/if}
   </header>

   {#if isPdf(doc)}
    <div class="pdf-viewer">
     <div class="pdf-toolbar">
      <a href={pdfUrl(doc.doc_id)} target="_blank" rel="noopener" class="pdf-open-btn">Open in new tab</a>
      <a href={pdfUrl(doc.doc_id)} download class="pdf-download-btn">Download</a>
     </div>
     <iframe src={pdfUrl(doc.doc_id)} class="pdf-embed" title={doc.title || doc.file_path}></iframe>
    </div>
   {:else if doc.content}
    <div class="markdown-content" bind:this={mdEl}>
     <!-- eslint-disable-next-line svelte/no-at-html-tags -->
     {@html renderMarkdownWithLinks(doc.content, doc.source, doc.file_path)}
    </div>
   {:else}
    <p class="no-content">This document has no content.</p>
   {/if}
  </article>

  {#if !isPdf(doc) && doc.content && tocOpen.value && currentDocToc.value.length > 0}
   <aside class="doc-toc-rail">
    <DocToc />
   </aside>
  {/if}
 </div>

 {#if !isPdf(doc) && doc.content}
  <FloatingDocControls docId={doc.doc_id} bind:bookmarked={isBookmarked} />
  <HighlightPopover docId={doc.doc_id} />
 {/if}
{/if}

<style>
 .status-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 60px;
  color: var(--text-secondary);
 }

 .error {
  color: var(--error);
 }

 .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
 }

 @keyframes spin {
  to {
   transform: rotate(360deg);
  }
 }

 .doc-layout {
  max-width: 960px;
  margin: 0 auto;
 }

 .document {
  min-width: 0;
 }

 @media (min-width: 1200px) {
  .doc-layout.has-toc {
   display: grid;
   grid-template-columns: minmax(0, 960px) 240px;
   gap: 40px;
   max-width: 1240px;
  }

  /* On desktop, pin the doc-header (bookmark, source, file path, dates,
     word/line counts) to the top of the scroll area so the reader can see
     where they are without scrolling back up. `.content` has padding-top:
     40px which insets the sticky element from the visible top of the
     scroll area, so pull the stuck position up by that amount and grow
     padding-top to compensate — keeps the bar flush against the navbar
     with no document text bleeding through above it. Background is opaque
     so document content scrolling underneath is hidden. */
  .doc-header {
   position: sticky;
   top: -40px;
   z-index: 50;
   margin-top: -40px;
   background: var(--bg-body);
  }
 }

 .doc-header {
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
 }

 .source-badge {
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
  text-decoration: none;
  transition: opacity 0.15s;
 }

 .source-badge:hover {
  opacity: 0.8;
 }

 .file-path {
  font-size: 16px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  word-break: break-all;
 }

 .doc-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin-top: 10px;
  font-size: 16px;
  color: var(--text-secondary);
 }

 .doc-dates-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 6px;
  font-size: 16px;
  color: var(--text-secondary);
 }

 .no-content {
  color: var(--text-secondary);
  font-style: italic;
 }

 .pdf-viewer {
  display: flex;
  flex-direction: column;
  gap: 10px;
 }

 .pdf-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
 }

 .pdf-open-btn,
 .pdf-download-btn {
  font-size: 14px;
  color: var(--brand);
  text-decoration: none;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  transition: background-color 0.15s;
 }

 .pdf-open-btn:hover,
 .pdf-download-btn:hover {
  background-color: var(--surface-hover, rgba(255, 255, 255, 0.05));
 }

 .pdf-embed {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 500px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface, #1a1a1a);
 }

 @media (max-width: 640px) {
  .source-badge {
   font-size: 16px;
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }
  .file-path {
   font-size: 14px;
  }
  .doc-dates-row {
   gap: 10px;
   font-size: 14px;
  }
 }
</style>
