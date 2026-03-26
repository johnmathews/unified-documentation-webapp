<script lang="ts">
 import { page } from "$app/state";
 import { fetchDocument, type FullDocument } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColor } from "$lib/colors";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import { marked } from "marked";

 let doc: FullDocument | null = $state(null);
 let loading = $state(true);
 let error = $state("");

 let currentId = $derived(decodeURIComponent(page.params.id ?? ""));

 $effect(() => {
  const id = currentId;
  currentDocId.value = id;
  loadDocument(id);

  return () => {
   // Clean up when leaving
   if (currentDocId.value === id) {
    currentDocId.value = null;
   }
  };
 });

 async function loadDocument(docId: string) {
  loading = true;
  error = "";
  doc = null;

  try {
   doc = await fetchDocument(docId);
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load document";
  } finally {
   loading = false;
  }
 }

 function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
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
</script>

<svelte:head>
 <title>{doc?.title || "Document"} - Documentation</title>
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
 <article class="document">
  <Breadcrumbs
   source={doc.source}
   category={doc.file_path.includes("journal/")
    ? "journal"
    : doc.file_path.includes(".engineering-team/")
      ? "engineering_team"
      : "docs"}
   title={doc.title || doc.file_path.split("/").pop() || doc.file_path}
  />
  <header class="doc-header">
   <div class="doc-dates">
    <a
     href="/source/{encodeURIComponent(doc.source)}"
     class="source-badge"
     style="background: {sourceColor(doc.source).bg}; color: {sourceColor(doc.source).text}">{doc.source}</a
    >
    <span class="file-path">{doc.file_path.split("/").pop()}</span>
    {#if doc.created_at}
     <span>Created: {formatDate(doc.created_at)}</span>
    {/if}
    {#if doc.modified_at}
     <span>Modified: {formatDate(doc.modified_at)}</span>
    {/if}
   </div>
  </header>

  {#if doc.content}
   <div class="markdown-content">
    {@html renderMarkdown(doc.content)}
   </div>
  {:else}
   <p class="no-content">This document has no content.</p>
  {/if}
 </article>
{/if}

<style>
 .status-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem;
  color: var(--text-muted);
 }

 .error {
  color: #f87171;
 }

 .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
 }

 @keyframes spin {
  to {
   transform: rotate(360deg);
  }
 }

 .document {
  max-width: 800px;
  margin: 0 auto;
 }

 .doc-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
 }

 .doc-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
 }

 .source-badge {
  font-size: 1rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  white-space: nowrap;
  text-decoration: none;
  transition: opacity 0.15s;
 }

 .source-badge:hover {
  opacity: 0.8;
 }

 .file-path {
  flex: 1;
  font-size: 1rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
 }

 .doc-header h1 {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
  margin: 0;
 }

 .doc-dates {
  display: flex;
  align-items: baseline;
  gap: 1.5rem;
  margin-top: 0.75rem;
  font-size: 1rem;
  color: var(--text-dim);
 }

 .doc-dates > span:not(.file-path) {
  flex-shrink: 0;
  white-space: nowrap;
 }

 .no-content {
  color: var(--text-muted);
  font-style: italic;
 }

 @media (max-width: 600px) {
  .doc-header h1 {
   font-size: 1.5rem;
  }
  .doc-meta {
   flex-wrap: wrap;
  }
  .source-badge {
   font-size: 0.85rem;
   padding: 0.4rem 0.75rem;
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }
  .file-path {
   font-size: 0.875rem;
  }
  .doc-dates {
   flex-wrap: wrap;
   gap: 0.5rem;
   font-size: 0.875rem;
  }
 }
</style>
