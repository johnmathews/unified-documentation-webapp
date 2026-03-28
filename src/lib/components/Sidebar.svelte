<script lang="ts">
 import { fetchTree, searchDocuments, type TreeSource, type SearchResult } from "$lib/api";
 import { currentDocId, categoryFilters, CATEGORIES } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";
 import { displaySource } from "$lib/titles";

 let showFilters = $state(false);


 let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

 let tree: TreeSource[] = $state([]);
 let loading = $state(true);
 let error = $state("");
 let expandedSources: Record<string, boolean> = $state({});
 let expandedCategories: Record<string, boolean> = $state({});

 let searchQuery = $state("");
 let searchResults: SearchResult[] = $state([]);
 let searching = $state(false);
 let searchTimeout: ReturnType<typeof setTimeout> | undefined;

 $effect(() => {
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

 function toggleSource(source: string) {
  expandedSources[source] = !expandedSources[source];
 }

 function toggleCategory(key: string) {
  expandedCategories[key] = !expandedCategories[key];
 }

 function expandAll() {
  for (const s of tree) {
   expandedSources[s.source] = true;
   expandedCategories[`${s.source}:docs`] = true;
   expandedCategories[`${s.source}:journal`] = true;
   expandedCategories[`${s.source}:engineering_team`] = true;
  }
 }

 function collapseAll() {
  for (const s of tree) {
   expandedSources[s.source] = false;
   expandedCategories[`${s.source}:docs`] = false;
   expandedCategories[`${s.source}:journal`] = false;
   expandedCategories[`${s.source}:engineering_team`] = false;
  }
 }

 let allExpanded = $derived(tree.length > 0 && tree.every((s) => expandedSources[s.source]));
 let allCollapsed = $derived(tree.length > 0 && tree.every((s) => !expandedSources[s.source]));

 function handleSearch() {
  clearTimeout(searchTimeout);
  if (!searchQuery.trim()) {
   searchResults = [];
   return;
  }
  searching = true;
  searchTimeout = setTimeout(async () => {
   try {
    searchResults = await searchDocuments(searchQuery);
   } catch {
    searchResults = [];
   } finally {
    searching = false;
   }
  }, 300);
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 function isActive(docId: string): boolean {
  return currentDocId.value === docId;
 }

 import { displayTitle } from "$lib/titles";

 function totalDocs(source: TreeSource): number {
  let count = 0;
  if (categoryFilters.isVisible('root_docs')) count += source.root_docs.length;
  if (categoryFilters.isVisible('docs')) count += source.docs.length;
  if (categoryFilters.isVisible('journal')) count += source.journal.length;
  if (categoryFilters.isVisible('engineering_team')) count += (source.engineering_team?.length ?? 0);
  return count;
 }

 let activeFilterCount = $derived(CATEGORIES.filter(c => !categoryFilters.isVisible(c.key)).length);
</script>

<div class="sidebar-inner">
 <div class="search-box">
  <input type="text" placeholder="Search documentation..." bind:value={searchQuery} oninput={handleSearch} />
 </div>

 <div class="filter-section">
  <button class="filter-toggle" onclick={() => showFilters = !showFilters}>
   <span class="filter-toggle-label">Filter categories</span>
   {#if activeFilterCount > 0}
    <span class="filter-badge">{activeFilterCount} hidden</span>
   {/if}
   <svg
    class="chevron"
    class:expanded={showFilters}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
   >
    <polyline points="9 18 15 12 9 6" />
   </svg>
  </button>

  {#if showFilters}
   <fieldset class="filter-checkboxes">
    {#each CATEGORIES as cat}
     <div class="filter-checkbox-item">
      <input
       class="filter-checkbox-input"
       type="checkbox"
       id="filter-{cat.key}"
       checked={categoryFilters.isVisible(cat.key)}
       onchange={() => categoryFilters.toggle(cat.key)}
      />
      <label class="filter-checkbox-label" for="filter-{cat.key}">{cat.label}</label>
     </div>
    {/each}
   </fieldset>
  {/if}
 </div>

 {#if searchQuery.trim()}
  <div class="search-results">
   {#if searching}
    <div class="loading-msg">Searching...</div>
   {:else if searchResults.length === 0}
    <div class="loading-msg">No results found</div>
   {:else}
    {#each searchResults as result}
     <a
      href={docUrl(result.doc_id)}
      class="tree-item search-result-item"
      class:active={isActive(result.doc_id)}
      onclick={onNavigate}
     >
      <span class="item-title">{displayTitle(result)}</span>
      <span
       class="source-tag {sourceColorClass(result.source)}"
       >{displaySource(result.source)}</span
      >
      <span class="item-snippet">{result.snippet}</span>
     </a>
    {/each}
   {/if}
  </div>
 {:else if loading}
  <div class="loading-msg">Loading sources...</div>
 {:else if error}
  <div class="error-msg">{error}</div>
 {:else}
  <nav class="tree">
   <div class="tree-header">
    <span class="tree-header-label"></span>
    <div class="expand-collapse">
     {#if !allExpanded}
      <button class="tree-text-btn" onclick={expandAll}>expand all</button>
     {/if}
     {#if !allExpanded && !allCollapsed}
      <span class="tree-text-sep">|</span>
     {/if}
     {#if !allCollapsed}
      <button class="tree-text-btn" onclick={collapseAll}>collapse all</button>
     {/if}
    </div>
   </div>
   {#each tree as source}
    <div class="tree-source">
     <button class="tree-toggle" onclick={() => toggleSource(source.source)}>
      <svg
       class="chevron"
       class:expanded={expandedSources[source.source]}
       width="14"
       height="14"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       stroke-width="2"
      >
       <polyline points="9 18 15 12 9 6" />
      </svg>
      <span
       class="source-tag {sourceColorClass(source.source)}"
       >{displaySource(source.source)}</span
      >
      <span class="count">{totalDocs(source)}</span>
     </button>

     {#if expandedSources[source.source]}
      {#if categoryFilters.isVisible('root_docs') && source.root_docs.length > 0}
       <div class="tree-items root-docs">
        {#each source.root_docs as doc}
         <a href={docUrl(doc.doc_id)} class="tree-item" class:active={isActive(doc.doc_id)} onclick={onNavigate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
           <polyline points="14 2 14 8 20 8" />
          </svg>
          <span class="item-title">{displayTitle(doc)}</span>
         </a>
        {/each}
       </div>
      {/if}

      {#if categoryFilters.isVisible('docs') && source.docs.length > 0}
       <div class="tree-category">
        <button class="tree-toggle category-toggle" onclick={() => toggleCategory(`${source.source}:docs`)}>
         <svg
          class="chevron"
          class:expanded={expandedCategories[`${source.source}:docs`]}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
         >
          <polyline points="9 18 15 12 9 6" />
         </svg>
         <span>Documentation Directory</span>
         <span class="count">{source.docs.length}</span>
        </button>

        {#if expandedCategories[`${source.source}:docs`]}
         <div class="tree-items">
          {#each source.docs as doc}
           <a href={docUrl(doc.doc_id)} class="tree-item" class:active={isActive(doc.doc_id)} onclick={onNavigate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
             <polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="item-title">{displayTitle(doc)}</span>
           </a>
          {/each}
         </div>
        {/if}
       </div>
      {/if}

      {#if categoryFilters.isVisible('journal') && source.journal.length > 0}
       <div class="tree-category">
        <button class="tree-toggle category-toggle" onclick={() => toggleCategory(`${source.source}:journal`)}>
         <svg
          class="chevron"
          class:expanded={expandedCategories[`${source.source}:journal`]}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
         >
          <polyline points="9 18 15 12 9 6" />
         </svg>
         <span>Development Journal</span>
         <span class="count">{source.journal.length}</span>
        </button>

        {#if expandedCategories[`${source.source}:journal`]}
         <div class="tree-items">
          {#each source.journal as doc}
           <a href={docUrl(doc.doc_id)} class="tree-item" class:active={isActive(doc.doc_id)} onclick={onNavigate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
             <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
             <line x1="16" y1="2" x2="16" y2="6" />
             <line x1="8" y1="2" x2="8" y2="6" />
             <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span class="item-title">{displayTitle(doc)}</span>
           </a>
          {/each}
         </div>
        {/if}
       </div>
      {/if}

      {#if categoryFilters.isVisible('engineering_team') && (source.engineering_team?.length ?? 0) > 0}
       <div class="tree-category">
        <button class="tree-toggle category-toggle" onclick={() => toggleCategory(`${source.source}:engineering_team`)}>
         <svg
          class="chevron"
          class:expanded={expandedCategories[`${source.source}:engineering_team`]}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
         >
          <polyline points="9 18 15 12 9 6" />
         </svg>
         <span>Engineering Analysis</span>
         <span class="count">{source.engineering_team?.length ?? 0}</span>
        </button>

        {#if expandedCategories[`${source.source}:engineering_team`]}
         <div class="tree-items">
          {#each source.engineering_team ?? [] as doc}
           <a href={docUrl(doc.doc_id)} class="tree-item" class:active={isActive(doc.doc_id)} onclick={onNavigate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
             <circle cx="12" cy="12" r="3" />
             <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
             />
            </svg>
            <span class="item-title">{displayTitle(doc)}</span>
           </a>
          {/each}
         </div>
        {/if}
       </div>
      {/if}
     {/if}
    </div>
   {/each}
  </nav>
 {/if}
</div>

<style>
 .sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface);
 }

 .search-box {
  padding: 15px;
  border-bottom: 1px solid var(--border);
 }

 .search-box input {
  width: 100%;
  padding: 10px 15px;
  background: var(--bg-body);
  border: 2px solid var(--border-strong);
  border-radius: 0;
  color: var(--text);
  font-size: 16px;
  outline: none;
  transition: border-color 0.15s;
 }

 .search-box input:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  box-shadow: inset 0 0 0 2px var(--border-strong);
 }

 .search-box input::placeholder {
  color: var(--text-muted);
 }

 /* Category filter section */
 .filter-section {
  border-bottom: 1px solid var(--border);
 }

 .filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 15px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
 }

 .filter-toggle:hover {
  background: var(--bg-hover);
 }

 .filter-toggle-label {
  flex: 1;
 }

 .filter-badge {
  font-size: 12px;
  padding: 1px 6px;
  background: var(--accent-dim);
  color: var(--accent);
  font-weight: 700;
 }

 .filter-checkboxes {
  border: none;
  padding: 0 15px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
 }

 /* GOV.UK small checkbox pattern */
 .filter-checkbox-item {
  display: flex;
  align-items: center;
  min-height: 28px;
  position: relative;
 }

 .filter-checkbox-input {
  position: absolute;
  width: 20px;
  height: 20px;
  opacity: 0;
  cursor: pointer;
 }

 .filter-checkbox-label {
  display: flex;
  align-items: center;
  padding: 3px 0 3px 30px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
  line-height: 1.3;
  user-select: none;
 }

 .filter-checkbox-label::before {
  content: "";
  position: absolute;
  left: 0;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-strong);
  background: var(--bg-body);
 }

 .filter-checkbox-input:checked + .filter-checkbox-label::before {
  background: var(--border-strong);
 }

 .filter-checkbox-input:checked + .filter-checkbox-label::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 7px;
  width: 12px;
  height: 6px;
  border-left: 3px solid var(--bg-body);
  border-bottom: 3px solid var(--bg-body);
  transform: rotate(-45deg);
 }

 .filter-checkbox-input:focus-visible + .filter-checkbox-label::before {
  outline: 3px solid var(--focus);
  outline-offset: 1px;
 }

 .tree-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  border-bottom: 1px solid var(--border);
 }

 .journal-link {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 16px;
  text-decoration: none;
  transition: color 0.15s;
 }

 .journal-link:hover {
  color: var(--text);
  text-decoration: underline;
 }

 .tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
 }

 .tree-header-label {
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
 }

 .expand-collapse {
  display: flex;
  align-items: center;
  gap: 5px;
 }

 .tree-text-btn {
  background: none;
  border: none;
  padding: 5px;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
  text-transform: lowercase;
 }

 .tree-text-btn:hover {
  color: var(--text);
 }

 .tree-text-sep {
  font-size: 14px;
  color: var(--text-muted);
  user-select: none;
 }

 .loading-msg,
 .error-msg {
  padding: 20px;
  color: var(--text-secondary);
  font-size: 16px;
  text-align: center;
 }

 .error-msg {
  color: var(--error);
 }

 .tree {
  flex: 1;
  overflow-y: auto;
  padding: 5px 0 10px;
 }

 .tree-source {
  margin-bottom: 5px;
 }

 .tree-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 10px 15px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
  transition: background 0.1s;
 }

 .tree-toggle:hover {
  background: var(--bg-hover);
 }

 .category-toggle {
  font-weight: 700;
  color: var(--text-secondary);
  padding-left: 30px;
  font-size: 16px;
 }

 .chevron {
  flex-shrink: 0;
  transition: transform 0.15s;
 }

 .chevron.expanded {
  transform: rotate(90deg);
 }

 .source-tag {
  font-size: 16px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
 }

 .count {
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--bg-body);
  padding: 2px 8px;
  border-radius: 0;
  flex-shrink: 0;
 }

 .tree-items {
  padding: 0;
 }

 .root-docs {
  padding-left: 0;
 }

 .tree-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px 10px 50px;
  color: var(--text);
  font-size: 16px;
  text-decoration: none;
  transition: all 0.1s;
  border-left: 4px solid transparent;
 }

 .tree-item:hover {
  background: var(--bg-hover);
  color: var(--text);
 }

 .tree-item.active {
  margin-left: -14px;
  padding-left: calc(50px + 10px);
  border-left: 4px solid var(--brand);
  background: var(--bg-body);
  color: var(--text);
  font-weight: bold;
 }

 .item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
 }

 .search-result-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding-left: 20px;
 }

 .item-snippet {
  font-size: 14px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
 }

 .search-results {
  flex: 1;
  overflow-y: auto;
 }

 @media (max-width: 768px) {
  .filter-toggle {
   min-height: 44px;
   padding: 10px 15px;
   font-size: 14px;
  }
  .filter-checkbox-item {
   min-height: 36px;
  }
  .filter-checkbox-label {
   font-size: 14px;
   min-height: 36px;
  }
  .tree-toggle {
   padding: 15px;
   min-height: 44px;
   font-size: 16px;
  }
  .category-toggle {
   padding-left: 30px;
   min-height: 44px;
   font-size: 16px;
  }
  .tree-item {
   padding: 15px 15px 15px 50px;
   min-height: 44px;
   font-size: 16px;
  }
  .tree-text-btn {
   font-size: 14px;
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }
  .tree-text-sep {
   font-size: 14px;
  }
  .search-box input {
   min-height: 44px;
   font-size: 16px; /* Explicit 16px prevents iOS Safari auto-zoom on focus */
  }
  .journal-link {
   min-height: 44px;
   display: inline-flex;
   align-items: center;
   font-size: 16px;
  }
  .source-tag {
   font-size: 16px;
   padding: 2px 8px;
  }
  .count {
   font-size: 14px;
   padding: 2px 10px;
  }
  .tree-header-label {
   font-size: 16px;
  }
  .item-snippet {
   font-size: 14px;
  }
  .search-result-item {
   padding: 15px 20px;
   min-height: 44px;
  }
  .loading-msg,
  .error-msg {
   font-size: 16px;
  }
 }
</style>
