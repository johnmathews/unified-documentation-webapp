<script lang="ts">
 import { fetchTree, type TreeSource } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";

 let tree: TreeSource[] = $state([]);
 let loading = $state(true);
 let error = $state("");

 $effect(() => {
  currentDocId.value = null;
  loadTree();
 });

 async function loadTree() {
  try {
   tree = await fetchTree();
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 import { displayTitle, displaySource } from "$lib/titles";
</script>

<svelte:head>
 <title>Documentation</title>
</svelte:head>

<!-- GOV.UK-style masthead hero -->
<div class="masthead">
 <div class="masthead__inner">
  <h1 class="masthead__title">Browse all documentation sources</h1>
  <p class="masthead__description">Search across all indexed documentation, journal entries and engineering analyses. Use the chat to ask questions about your docs.</p>
 </div>
</div>

<div class="home">

 {#if loading}
  <div class="loading">Loading sources...</div>
 {:else if error}
  <div class="error">{error}</div>
 {:else if tree.length === 0}
  <div class="empty">
   <p>No documentation sources have been indexed yet.</p>
   <p>Check that the MCP server is running and has sources configured.</p>
  </div>
 {:else}
  <div class="sources-grid">
   {#each tree as source}
    <div
     class="source-card {sourceColorClass(source.source)}"
    >
     <h2><a href="/source/{encodeURIComponent(source.source)}">{displaySource(source.source)}</a></h2>
     <div class="stats">
      <span>{source.root_docs.length + source.docs.length} docs</span>
      <span>{source.journal.length} journal entries</span>
      <span>{source.engineering_team?.length ?? 0} engineering analyses</span>
     </div>

     {#if source.root_docs.length > 0}
      <div class="doc-section">
       <h3>Root Docs</h3>
       <ul>
        {#each source.root_docs as doc}
         <li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
        {/each}
       </ul>
      </div>
     {/if}

     {#if source.docs.length > 0}
      <div class="doc-section">
       <h3><a href="/source/{encodeURIComponent(source.source)}/docs">Documentation</a></h3>
       <ul>
        {#each source.docs.slice(0, 5) as doc}
         <li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
        {/each}
        {#if source.docs.length > 5}
         <li class="more">+{source.docs.length - 5} more</li>
        {/if}
       </ul>
      </div>
     {/if}

     {#if source.journal.length > 0}
      <div class="doc-section">
       <h3><a href="/source/{encodeURIComponent(source.source)}/journal">Recent Journal Entries</a></h3>
       <ul>
        {#each source.journal.slice(0, 3) as doc}
         <li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
        {/each}
        {#if source.journal.length > 3}
         <li class="more">+{source.journal.length - 3} more</li>
        {/if}
       </ul>
      </div>
     {/if}

     {#if (source.engineering_team?.length ?? 0) > 0}
      <div class="doc-section">
       <h3><a href="/source/{encodeURIComponent(source.source)}/engineering_team">Engineering Analysis</a></h3>
       <ul>
        {#each (source.engineering_team ?? []).slice(0, 3) as doc}
         <li><a href={docUrl(doc.doc_id)}>{displayTitle(doc)}</a></li>
        {/each}
        {#if (source.engineering_team?.length ?? 0) > 3}
         <li class="more">+{(source.engineering_team?.length ?? 0) - 3} more</li>
        {/if}
       </ul>
      </div>
     {/if}
    </div>
   {/each}
  </div>
 {/if}
</div>

<style>
 /* GOV.UK masthead — blue hero section */
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
  margin-bottom: 20px;
 }

 @media (min-width: 641px) {
  .masthead__title {
   font-size: 3rem;
   line-height: 1.0416666667;
   margin-bottom: 30px;
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

 .home {
  max-width: 960px;
  margin: 0 auto;
  padding-top: 40px;
 }

 .loading,
 .error,
 .empty {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
 }

 .error {
  color: var(--error);
 }

 .sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr));
  gap: 20px;
 }

 .source-card {
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 25px;
 }

 .source-card h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
 }

 .source-card h2 a {
  color: var(--link);
  text-decoration: underline;
  text-decoration-thickness: max(1px, .0625rem);
  text-underline-offset: .1578em;
 }

 .source-card h2 a:hover {
  color: var(--link-hover);
  text-decoration-thickness: max(3px, .1875rem, .12em);
 }

 .stats {
  display: flex;
  gap: 15px;
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 15px;
 }

 .doc-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
 }

 .doc-section h3 {
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
 }

 .doc-section h3 a {
  color: var(--link);
  font-weight: 700;
 }

 .doc-section h3 a:hover {
  color: var(--link-hover);
 }

 .doc-section ul {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
 }

 .doc-section li {
  padding: 3px 0;
  font-size: 16px;
  line-height: 1.25;
 }

 .doc-section a {
  font-size: 16px;
 }

 .more {
  font-size: 16px;
  color: var(--text-secondary);
  list-style: none;
  margin-left: -20px;
 }

 @media (max-width: 640px) {
  .masthead {
   margin: -20px -15px 0;
   padding-left: 15px;
   padding-right: 15px;
  }

  .sources-grid {
   grid-template-columns: 1fr;
  }
  .stats {
   font-size: 16px;
  }
  .doc-section h3 {
   font-size: 16px;
  }
  .doc-section li {
   padding: 5px 0;
  }
  .doc-section a {
   min-height: 36px;
   display: inline-flex;
   align-items: center;
   font-size: 16px;
  }
  .more {
   font-size: 14px;
  }
 }
</style>
