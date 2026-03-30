<script lang="ts">
 import { searchDocuments, fetchSources, type SearchResult, type SearchFilters } from "$lib/api";
 import { sourceColorClass } from "$lib/colors";
 import { displaySource, displayTitle } from "$lib/titles";
 import { currentDocId } from "$lib/stores.svelte";

 let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

 let searchQuery = $state("");
 let searchResults: SearchResult[] = $state([]);
 let searching = $state(false);
 let searchTimeout: ReturnType<typeof setTimeout> | undefined;
 let hasSearched = $state(false);

 let showFilters = $state(false);

 // Source filter
 let availableSources: string[] = $state([]);
 let selectedSource = $state("");
 let sourcesLoading = $state(true);

 // Doc type filter
 let selectedDocType = $state("");

 // Date filters
 let createdAfterDay = $state("");
 let createdAfterMonth = $state("");
 let createdAfterYear = $state("");
 let createdBeforeDay = $state("");
 let createdBeforeMonth = $state("");
 let createdBeforeYear = $state("");
 let modifiedAfterDay = $state("");
 let modifiedAfterMonth = $state("");
 let modifiedAfterYear = $state("");
 let modifiedBeforeDay = $state("");
 let modifiedBeforeMonth = $state("");
 let modifiedBeforeYear = $state("");

 $effect(() => {
  loadSources();
 });

 async function loadSources() {
  try {
   availableSources = await fetchSources();
  } catch {
   availableSources = [];
  } finally {
   sourcesLoading = false;
  }
 }

 function buildDateString(day: string, month: string, year: string): string | undefined {
  if (!year) return undefined;
  const y = year.padStart(4, "0");
  const m = (month || "1").padStart(2, "0");
  const d = (day || "1").padStart(2, "0");
  return `${y}-${m}-${d}`;
 }

 function buildFilters(): SearchFilters {
  return {
   source: selectedSource || undefined,
   docType: selectedDocType || undefined,
   createdAfter: buildDateString(createdAfterDay, createdAfterMonth, createdAfterYear),
   createdBefore: buildDateString(createdBeforeDay, createdBeforeMonth, createdBeforeYear),
   modifiedAfter: buildDateString(modifiedAfterDay, modifiedAfterMonth, modifiedAfterYear),
   modifiedBefore: buildDateString(modifiedBeforeDay, modifiedBeforeMonth, modifiedBeforeYear),
  };
 }

 let activeFilterCount = $derived(
  (createdAfterYear ? 1 : 0) +
   (createdBeforeYear ? 1 : 0) +
   (modifiedAfterYear ? 1 : 0) +
   (modifiedBeforeYear ? 1 : 0),
 );

 function handleSearch() {
  clearTimeout(searchTimeout);
  if (!searchQuery.trim()) {
   searchResults = [];
   hasSearched = false;
   return;
  }
  searching = true;
  hasSearched = true;
  searchTimeout = setTimeout(async () => {
   try {
    searchResults = await searchDocuments(searchQuery, buildFilters());
   } catch {
    searchResults = [];
   } finally {
    searching = false;
   }
  }, 300);
 }

 function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  clearTimeout(searchTimeout);
  if (!searchQuery.trim()) return;
  searching = true;
  hasSearched = true;
  (async () => {
   try {
    searchResults = await searchDocuments(searchQuery, buildFilters());
   } catch {
    searchResults = [];
   } finally {
    searching = false;
   }
  })();
 }

 function clearFilters() {
  selectedSource = "";
  selectedDocType = "";
  createdAfterDay = "";
  createdAfterMonth = "";
  createdAfterYear = "";
  createdBeforeDay = "";
  createdBeforeMonth = "";
  createdBeforeYear = "";
  modifiedAfterDay = "";
  modifiedAfterMonth = "";
  modifiedAfterYear = "";
  modifiedBeforeDay = "";
  modifiedBeforeMonth = "";
  modifiedBeforeYear = "";
  if (searchQuery.trim()) handleSearch();
 }

 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 function isActive(docId: string): boolean {
  return currentDocId.value === docId;
 }

 function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
   const d = new Date(dateStr);
   return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
   return "";
  }
 }
</script>

<div class="search-panel-inner">
 <form class="search-form" onsubmit={handleSubmit}>
  <label for="search-input" class="search-label">Search documentation</label>
  <div class="search-input-wrapper">
   <input
    id="search-input"
    class="search-input"
    type="search"
    placeholder="Search by keyword..."
    bind:value={searchQuery}
    oninput={handleSearch}
    enterkeyhint="search"
    autocomplete="off"
   />
   <button class="search-button" type="submit" aria-label="Search">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
     <circle cx="11" cy="11" r="8" />
     <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
   </button>
  </div>
 </form>

 <!-- Source & type filters — always visible -->
 <div class="primary-filters">
  <fieldset class="filter-group">
   <legend class="filter-group-legend">Source</legend>
   {#if sourcesLoading}
    <p class="filter-hint">Loading sources...</p>
   {:else if availableSources.length === 0}
    <p class="filter-hint">No sources available</p>
   {:else}
    <div class="filter-select-wrapper">
     <select
      class="filter-select"
      bind:value={selectedSource}
      onchange={() => {
       if (searchQuery.trim()) handleSearch();
      }}
     >
      <option value="">All sources</option>
      {#each availableSources as source}
       <option value={source}>{displaySource(source)}</option>
      {/each}
     </select>
    </div>
   {/if}
  </fieldset>
  <fieldset class="filter-group">
   <legend class="filter-group-legend">Type</legend>
   <div class="filter-select-wrapper">
    <select
     class="filter-select"
     bind:value={selectedDocType}
     onchange={() => {
      if (searchQuery.trim()) handleSearch();
     }}
    >
     <option value="">All types</option>
     <option value="root_docs">Root Docs</option>
     <option value="docs">Docs</option>
     <option value="journal">Journal</option>
     <option value="engineering_team">Engineering Team</option>
     <option value="pdf">PDF</option>
    </select>
   </div>
  </fieldset>
 </div>

 <div class="filter-section">
  <button class="filter-toggle" onclick={() => (showFilters = !showFilters)}>
   <span class="filter-toggle-label">Filters</span>
   {#if activeFilterCount > 0}
    <span class="filter-badge">{activeFilterCount} active</span>
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
   <div class="filter-body">
    <!-- Created date filter -->
    <fieldset class="filter-group">
     <legend class="filter-group-legend">Created date</legend>
     <div class="date-range">
      <div class="date-row">
       <span class="date-row-label">After</span>
       <div class="date-inputs">
        <div class="date-field">
         <label for="created-after-day" class="date-input-label">Day</label>
         <input
          id="created-after-day"
          class="date-input date-input--day"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={createdAfterDay}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="created-after-month" class="date-input-label">Month</label>
         <input
          id="created-after-month"
          class="date-input date-input--month"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={createdAfterMonth}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="created-after-year" class="date-input-label">Year</label>
         <input
          id="created-after-year"
          class="date-input date-input--year"
          type="text"
          inputmode="numeric"
          maxlength="4"
          bind:value={createdAfterYear}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
       </div>
      </div>
      <div class="date-row">
       <span class="date-row-label">Before</span>
       <div class="date-inputs">
        <div class="date-field">
         <label for="created-before-day" class="date-input-label">Day</label>
         <input
          id="created-before-day"
          class="date-input date-input--day"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={createdBeforeDay}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="created-before-month" class="date-input-label">Month</label>
         <input
          id="created-before-month"
          class="date-input date-input--month"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={createdBeforeMonth}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="created-before-year" class="date-input-label">Year</label>
         <input
          id="created-before-year"
          class="date-input date-input--year"
          type="text"
          inputmode="numeric"
          maxlength="4"
          bind:value={createdBeforeYear}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
       </div>
      </div>
     </div>
    </fieldset>

    <!-- Modified date filter -->
    <fieldset class="filter-group">
     <legend class="filter-group-legend">Modified date</legend>
     <div class="date-range">
      <div class="date-row">
       <span class="date-row-label">After</span>
       <div class="date-inputs">
        <div class="date-field">
         <label for="modified-after-day" class="date-input-label">Day</label>
         <input
          id="modified-after-day"
          class="date-input date-input--day"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={modifiedAfterDay}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="modified-after-month" class="date-input-label">Month</label>
         <input
          id="modified-after-month"
          class="date-input date-input--month"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={modifiedAfterMonth}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="modified-after-year" class="date-input-label">Year</label>
         <input
          id="modified-after-year"
          class="date-input date-input--year"
          type="text"
          inputmode="numeric"
          maxlength="4"
          bind:value={modifiedAfterYear}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
       </div>
      </div>
      <div class="date-row">
       <span class="date-row-label">Before</span>
       <div class="date-inputs">
        <div class="date-field">
         <label for="modified-before-day" class="date-input-label">Day</label>
         <input
          id="modified-before-day"
          class="date-input date-input--day"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={modifiedBeforeDay}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="modified-before-month" class="date-input-label">Month</label>
         <input
          id="modified-before-month"
          class="date-input date-input--month"
          type="text"
          inputmode="numeric"
          maxlength="2"
          bind:value={modifiedBeforeMonth}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
        <div class="date-field">
         <label for="modified-before-year" class="date-input-label">Year</label>
         <input
          id="modified-before-year"
          class="date-input date-input--year"
          type="text"
          inputmode="numeric"
          maxlength="4"
          bind:value={modifiedBeforeYear}
          onchange={() => {
           if (searchQuery.trim()) handleSearch();
          }}
         />
        </div>
       </div>
      </div>
     </div>
    </fieldset>

    {#if activeFilterCount > 0}
     <button class="clear-filters-btn" onclick={clearFilters}>Clear all filters</button>
    {/if}
   </div>
  {/if}
 </div>

 <div class="search-results">
  {#if searching}
   <div class="search-msg">Searching...</div>
  {:else if hasSearched && searchResults.length === 0}
   <div class="search-msg">No results found</div>
  {:else if searchResults.length > 0}
   <div class="results-count">{searchResults.length} result{searchResults.length === 1 ? "" : "s"}</div>
   {#each searchResults as result}
    <a
     href={docUrl(result.doc_id)}
     class="result-item"
     class:active={isActive(result.doc_id)}
     onclick={onNavigate}
    >
     <span class="result-title">{displayTitle(result)}</span>
     <div class="result-meta">
      <span class="source-tag {sourceColorClass(result.source)}">{displaySource(result.source)}</span>
      {#if result.created_at}
       <span class="result-date">Created {formatDate(result.created_at)}</span>
      {/if}
      {#if result.modified_at}
       <span class="result-date">Modified {formatDate(result.modified_at)}</span>
      {/if}
     </div>
     <span class="result-snippet">{result.snippet}</span>
    </a>
   {/each}
  {/if}
 </div>
</div>

<style>
 .search-panel-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface);
 }

 /* Search form */
 .search-form {
  padding: 15px;
  border-bottom: 1px solid var(--border);
 }

 .search-label {
  display: block;
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
  line-height: 1.3157894737;
 }

 .search-input-wrapper {
  display: flex;
 }

 .search-input {
  flex: 1;
  padding: 10px 15px;
  background: var(--bg-body);
  border: 2px solid var(--border-strong);
  border-right: none;
  border-radius: 0;
  color: var(--text);
  font-size: 16px;
  font-family: inherit;
  outline: none;
  min-height: 40px;
 }

 .search-input:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  box-shadow: inset 0 0 0 2px var(--border-strong);
  z-index: 1;
 }

 .search-input::placeholder {
  color: var(--text-muted);
 }

 .search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-height: 40px;
  background: var(--brand);
  border: 2px solid var(--brand);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
 }

 .search-button:hover {
  background: var(--brand-dark);
  border-color: var(--brand-dark);
 }

 .search-button:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  background: var(--focus);
  border-color: var(--focus);
  color: var(--focus-text);
 }

 /* Primary filters — always visible */
 .primary-filters {
  padding: 10px 15px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
 }

 /* Filter section */
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
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
 }

 .filter-toggle:hover {
  background: var(--bg-hover);
 }

 .filter-toggle:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
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

 .chevron {
  flex-shrink: 0;
  transition: transform 0.15s;
 }

 .chevron.expanded {
  transform: rotate(90deg);
 }

 .filter-body {
  padding: 0 15px 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
 }

 .filter-group {
  border: none;
  padding: 0;
  margin: 0;
 }

 .filter-group-legend {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
  padding: 0;
 }

 .filter-hint {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
 }

 /* Source select - GOV.UK style */
 .filter-select-wrapper {
  position: relative;
 }

 .filter-select {
  width: 100%;
  padding: 8px 30px 8px 10px;
  font-size: 16px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-body);
  border: 2px solid var(--border-strong);
  border-radius: 0;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23505a5f' d='M1.41.59L6 5.17 10.59.59 12 2l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
 }

 .filter-select:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  box-shadow: inset 0 0 0 2px var(--border-strong);
 }

 /* Date inputs - GOV.UK pattern */
 .date-range {
  display: flex;
  flex-direction: column;
  gap: 10px;
 }

 .date-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
 }

 .date-row-label {
  font-size: 14px;
  color: var(--text-secondary);
  width: 45px;
  flex-shrink: 0;
  padding-bottom: 8px;
 }

 .date-inputs {
  display: flex;
  gap: 8px;
 }

 .date-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
 }

 .date-input-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
 }

 .date-input {
  padding: 6px 8px;
  font-size: 16px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-body);
  border: 2px solid var(--border-strong);
  border-radius: 0;
  text-align: center;
 }

 .date-input:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  box-shadow: inset 0 0 0 2px var(--border-strong);
 }

 .date-input--day,
 .date-input--month {
  width: 44px;
 }

 .date-input--year {
  width: 64px;
 }

 .clear-filters-btn {
  display: inline-block;
  padding: 8px 15px;
  background: none;
  border: none;
  color: var(--link);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-align: left;
 }

 .clear-filters-btn:hover {
  color: var(--link-hover);
  text-decoration-thickness: max(3px, 0.1875rem, 0.12em);
 }

 .clear-filters-btn:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  background: var(--focus);
  color: var(--focus-text);
  text-decoration: none;
 }

 /* Results */
 .search-results {
  flex: 1;
  overflow-y: auto;
 }

 .search-msg {
  padding: 20px 15px;
  color: var(--text-secondary);
  font-size: 16px;
  text-align: center;
 }

 .results-count {
  padding: 10px 15px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
 }

 .result-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 15px;
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  border-left: 4px solid transparent;
  transition: all 0.1s;
 }

 .result-item:hover {
  background: var(--bg-hover);
 }

 .result-item.active {
  border-left-color: var(--brand);
  background: var(--bg-body);
  font-weight: bold;
 }

 .result-title {
  font-size: 16px;
  color: var(--link);
  text-decoration: underline;
  text-decoration-thickness: max(1px, 0.0625rem);
  text-underline-offset: 0.1578em;
 }

 .result-item:hover .result-title {
  text-decoration-thickness: max(3px, 0.1875rem, 0.12em);
 }

 .result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
 }

 .source-tag {
  font-size: 14px;
  font-weight: bold;
  padding: 1px 6px;
  white-space: nowrap;
 }

 .result-date {
  font-size: 12px;
  color: var(--text-muted);
 }

 .result-snippet {
  font-size: 14px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
 }

 @media (max-width: 768px) {
  .search-label {
   font-size: 16px;
  }

  .search-input {
   min-height: 44px;
   font-size: 16px;
  }

  .search-button {
   width: 44px;
   min-height: 44px;
  }

  .filter-toggle {
   min-height: 44px;
  }

  .filter-select {
   min-height: 44px;
  }

  .date-input {
   min-height: 44px;
   font-size: 16px;
  }

  .result-item {
   padding: 15px;
   min-height: 44px;
  }

  .clear-filters-btn {
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }
 }
</style>
