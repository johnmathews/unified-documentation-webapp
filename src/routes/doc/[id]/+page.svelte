<script lang="ts">
 import { page } from "$app/state";
 import {
  fetchDocument,
  checkBookmarks,
  fetchHealth,
  githubFileUrl,
  type FullDocument,
 } from "$lib/api";
 import { currentDocId, currentDocToc, tocOpen } from "$lib/stores.svelte";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import BookmarkButton from "$lib/components/BookmarkButton.svelte";
 import FloatingDocControls from "$lib/components/FloatingDocControls.svelte";
 import DocToc from "$lib/components/DocToc.svelte";
 import HighlightPopover from "$lib/components/HighlightPopover.svelte";
 import { displaySource, displayTitle, stripSourcePrefix } from "$lib/titles";
 import { renderMarkdownWithLinks, extractHeadings, parseFrontmatter } from "$lib/links";
 import { countDocStats } from "$lib/docStats";
 import { formatDateTime } from "$lib/datetime";
 import { applyHighlights, loadHighlights } from "$lib/highlights";

 let doc: FullDocument | null = $state(null);
 let loading = $state(true);
 let error = $state("");
 let isBookmarked = $state(false);
 let mdEl = $state<HTMLElement | null>(null);
 // The rendered markdown almost always opens with its own <h1> that repeats
 // the page's .doc-title. Hide the (sticky-header) .doc-title while that
 // in-body h1 is still on screen; reveal it only once the h1 has scrolled
 // off the top, so the title stays pinned without showing twice. Docs with
 // no leading h1 keep the title visible (no duplicate to suppress).
 let titleHidden = $state(false);
 // "View on GitHub" target — null unless this doc's source is github-backed.
 let githubUrl = $state<string | null>(null);

 let currentId = $derived(decodeURIComponent(page.params.id ?? ""));

 // Frontmatter is split off the raw content so the body renders cleanly and
 // the metadata shows as a tidy block instead of a bold blob.
 let parsed = $derived.by(() => {
  if (!doc || !doc.content || isPdf(doc)) {
   return { entries: [], body: doc?.content ?? "" };
  }
  return parseFrontmatter(doc.content);
 });

 let stats = $derived.by(() => {
  if (!doc || !doc.content) return null;
  return countDocStats(parsed.body);
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
  githubUrl = null;
  currentDocToc.value = [];

  try {
   doc = await fetchDocument(docId);
   if (doc.content && !doc.file_path.toLowerCase().endsWith(".pdf")) {
    currentDocToc.value = extractHeadings(parseFrontmatter(doc.content).body);
   }
   // Resolve a "View on GitHub" link from the source's repo metadata.
   // Best-effort: a health-fetch failure must not break the doc view.
   try {
    const loaded = doc;
    const health = await fetchHealth();
    const src = health.sources.find((s) => s.source === loaded.source);
    githubUrl = githubFileUrl(src?.repo_url, src?.branch, loaded.file_path);
   } catch {
    githubUrl = null;
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
  return formatDateTime(dateStr);
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

 $effect(() => {
  // Re-run whenever the rendered body changes or the element rebinds.
  const root = mdEl;
  const content = doc?.content;
  if (!root || !content) {
   titleHidden = false;
   return;
  }
  const h1 = root.querySelector("h1");
  if (!h1) {
   // No in-body title to collide with — show .doc-title normally.
   titleHidden = false;
   return;
  }
  titleHidden = true;
  // Negative top margin ≈ the sticky doc-header's own height, so the
  // swap happens as the real h1 slides under the pinned header rather
  // than at the raw viewport edge. Known limitation: toggling .doc-title
  // changes the sticky header's height, nudging the observed h1 — at the
  // exact transition point a stationary scroll can flicker. Acceptable
  // for momentum scrolling; revisit with dual-threshold hysteresis only
  // if it proves annoying in practice.
  const observer = new IntersectionObserver(
   ([entry]) => {
    titleHidden = entry.isIntersecting;
   },
   { rootMargin: "-100px 0px 0px 0px", threshold: 0 },
  );
  observer.observe(h1);
  return () => observer.disconnect();
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
   <header class="doc-header">
    <Breadcrumbs source={doc.source} filePath={doc.file_path} />
    <h1 class="doc-title" class:is-hidden={titleHidden}>
     {doc.title
      ? stripSourcePrefix(doc.title, doc.source)
      : doc.file_path.split("/").pop() || doc.file_path}
    </h1>
   </header>
   <div class="doc-meta">
    <BookmarkButton docId={doc.doc_id} bind:bookmarked={isBookmarked} />
    <a href="/source/{encodeURIComponent(doc.source)}" class="source-badge">{displaySource(doc.source)}</a>
    <span class="meta-sep" aria-hidden="true">/</span>
    <span class="file-path">{doc.file_path}</span>
    {#if doc.modified_at}
     <span class="meta-sep" aria-hidden="true">·</span>
     <span>Modified {formatDate(doc.modified_at)}</span>
    {/if}
    {#if stats}
     <span class="meta-sep" aria-hidden="true">·</span>
     <span>{stats.words.toLocaleString()} words</span>
    {/if}
    {#if githubUrl}
     <span class="meta-sep" aria-hidden="true">·</span>
     <a class="github-link" href={githubUrl} target="_blank" rel="noopener noreferrer">
      View on GitHub
     </a>
    {/if}
   </div>

   {#if isPdf(doc)}
    <div class="pdf-viewer">
     <div class="pdf-toolbar">
      <a href={pdfUrl(doc.doc_id)} target="_blank" rel="noopener" class="pdf-open-btn">Open in new tab</a>
      <a href={pdfUrl(doc.doc_id)} download class="pdf-download-btn">Download</a>
     </div>
     <iframe src={pdfUrl(doc.doc_id)} class="pdf-embed" title={doc.title || doc.file_path}></iframe>
    </div>
   {:else if doc.content}
    {#if parsed.entries.length > 0}
     <dl class="frontmatter">
      {#each parsed.entries as entry (entry.key)}
       <div class="frontmatter-row">
        <dt>{entry.key}</dt>
        <dd>{entry.value}</dd>
       </div>
      {/each}
     </dl>
    {/if}
    <div class="markdown-content" bind:this={mdEl}>
     <!-- eslint-disable-next-line svelte/no-at-html-tags -->
     {@html renderMarkdownWithLinks(parsed.body, doc.source, doc.file_path)}
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
 .frontmatter {
  margin: 0 0 30px;
  padding: 15px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
 }

 .frontmatter-row {
  display: grid;
  grid-template-columns: minmax(110px, max-content) 1fr;
  gap: 6px 20px;
  padding: 6px 0;
 }

 .frontmatter-row + .frontmatter-row {
  border-top: 1px solid var(--border);
 }

 .frontmatter dt {
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--text-secondary);
  word-break: break-word;
 }

 .frontmatter dd {
  margin: 0;
  font-size: 17px;
  color: var(--text);
  overflow-wrap: anywhere;
 }

 @media (max-width: 480px) {
  .frontmatter-row {
   grid-template-columns: 1fr;
   gap: 2px;
  }
 }

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

 /* Centred reading column so the doc page matches the visual rhythm of the
    home and journal pages on wide displays — left-aligning the column at
    the 30px inset left an oceans-wide empty band on its right that felt
    abandoned rather than intentional. The bands/chrome above stay
    full-bleed (see +layout.svelte); only the reading column re-centres. */
 .doc-layout {
  max-width: 900px;
  margin: 0 auto;
 }

 .document {
  min-width: 0;
 }

 @media (min-width: 1024px) {
  .doc-layout.has-toc {
   display: grid;
   grid-template-columns: minmax(0, 720px) 240px;
   gap: 40px;
   max-width: 1000px;
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
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
 }

 /* Breadcrumbs now live inside the (sticky, opaque) header so the header
    can no longer paint over them — they stay visible on every doc and
    stay pinned alongside the title when scrolled. */
 .doc-header :global(.govuk-breadcrumbs) {
  margin-top: 0;
  margin-bottom: 8px;
 }

 /* The document title is the single most important thing to keep visible
    while scrolling, so it sits in the sticky header above the metadata. */
 .doc-title {
  font-size: 19px;
  line-height: 1.25;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--text);
  overflow-wrap: anywhere;
 }

 .doc-title.is-hidden {
  display: none;
 }

 @media (min-width: 641px) {
  .doc-title {
   font-size: 24px;
  }
 }

 .source-badge {
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
 }

 .file-path {
  font-size: 16px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  word-break: break-all;
 }

 .github-link {
  font-size: 16px;
  white-space: nowrap;
 }

 .doc-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 10px;
  margin-bottom: 30px;
  font-size: 15px;
  color: var(--text-secondary);
 }

 .meta-sep {
  color: var(--border-strong);
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
 }
</style>
