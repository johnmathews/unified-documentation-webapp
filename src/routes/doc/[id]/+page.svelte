<script lang="ts">
 import { page } from "$app/state";
 import { fetchDocument, type FullDocument } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";
 import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
 import { displaySource } from "$lib/titles";
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
   <div class="doc-meta-row">
    <a
     href="/source/{encodeURIComponent(doc.source)}"
     class="source-badge {sourceColorClass(doc.source)}">{displaySource(doc.source)}</a
    >
    <span class="file-path">{doc.file_path}</span>
   </div>
   {#if doc.created_at || doc.modified_at}
    <div class="doc-dates-row">
     {#if doc.created_at}
      <span>Created: {formatDate(doc.created_at)}</span>
     {/if}
     {#if doc.modified_at}
      <span>Modified: {formatDate(doc.modified_at)}</span>
     {/if}
    </div>
   {/if}
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

 .document {
  max-width: 960px;
  margin: 0 auto;
 }

 .doc-header {
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
 }

 .doc-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
 }

 .source-badge {
  font-size: 16px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 0;
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

 @media (max-width: 640px) {
  .source-badge {
   font-size: 16px;
   padding: 2px 8px;
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
