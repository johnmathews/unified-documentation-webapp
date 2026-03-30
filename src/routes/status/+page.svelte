<script lang="ts">
 import { fetchHealth, type HealthStatus } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { sourceColorClass } from "$lib/colors";
 import { displaySource } from "$lib/titles";

 let health: HealthStatus | null = $state(null);
 let loading = $state(true);
 let error = $state("");
 let refreshing = $state(false);

 type SortKey = "source" | "file_count" | "chunk_count" | "last_indexed";
 let sortKey: SortKey = $state("last_indexed");
 let sortAsc = $state(false);

 function toggleSort(key: SortKey) {
  if (sortKey === key) {
   sortAsc = !sortAsc;
  } else {
   sortKey = key;
   sortAsc = key === "source";
  }
 }

 let sortedSources = $derived.by(() => {
  if (!health) return [];
  const sorted = [...health.sources].sort((a, b) => {
   let cmp: number;
   if (sortKey === "source") {
    cmp = a.source.localeCompare(b.source);
   } else if (sortKey === "last_indexed") {
    const ta = a.last_indexed || "";
    const tb = b.last_indexed || "";
    cmp = ta.localeCompare(tb);
   } else {
    cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
   }
   return sortAsc ? cmp : -cmp;
  });
  return sorted;
 });

 function sortIndicator(key: SortKey): string {
  if (sortKey !== key) return "";
  return sortAsc ? " \u25B2" : " \u25BC";
 }

 $effect(() => {
  currentDocId.value = null;
  loadHealth();
 });

 async function loadHealth() {
  try {
   health = await fetchHealth();
   error = "";
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
   refreshing = false;
  }
 }

 async function refresh() {
  refreshing = true;
  await loadHealth();
 }

 function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  try {
   const date = new Date(ts);
   return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
   });
  } catch {
   return ts;
  }
 }

 function timeAgo(ts: string | null): string {
  if (!ts) return "";
  try {
   const diff = Date.now() - new Date(ts).getTime();
   const mins = Math.floor(diff / 60000);
   if (mins < 1) return "just now";
   if (mins < 60) return `${mins}m ago`;
   const hours = Math.floor(mins / 60);
   if (hours < 24) return `${hours}h ago`;
   const days = Math.floor(hours / 24);
   return `${days}d ago`;
  } catch {
   return "";
  }
 }
</script>

<svelte:head>
 <title>Server Status - Documentation Library</title>
</svelte:head>

{#if loading}
 <div class="status-msg"><p>Loading...</p></div>
{:else if error}
 <div class="status-msg">
  <p class="error">{error}</p>
  <a href="/">Back to home</a>
 </div>
{:else if health}
 <div class="masthead">
  <div class="masthead__inner">
   <h1 class="masthead__title">Server Status</h1>
   <p class="masthead__description">
    {health.total_sources} sources &middot;
    {health.sources.reduce((n, s) => n + s.file_count, 0)} files &middot;
    {health.total_chunks} vector chunks
   </p>
  </div>
 </div>

 <div class="status-page">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
   <a href="/">Home</a>
   <span class="sep">/</span>
   <span class="current">Server Status</span>
  </nav>

  <div class="status-header">
   <div class="status-badge" class:ok={health.status === "ok"} class:err={health.status !== "ok"}>
    {health.status === "ok" ? "Healthy" : health.status}
   </div>
   <button class="refresh-btn" onclick={refresh} disabled={refreshing}>
    {refreshing ? "Refreshing..." : "Refresh"}
   </button>
  </div>

  <table class="source-table">
   <thead>
    <tr>
     <th><button class="sort-btn" onclick={() => toggleSort("source")}>Source{sortIndicator("source")}</button></th>
     <th class="num"
      ><button class="sort-btn sort-btn-right" onclick={() => toggleSort("file_count")}
       >Files{sortIndicator("file_count")}</button
      ></th
     >
     <th class="num"
      ><button class="sort-btn sort-btn-right" onclick={() => toggleSort("chunk_count")}
       >Chunks{sortIndicator("chunk_count")}</button
      ></th
     >
     <th
      ><button class="sort-btn" onclick={() => toggleSort("last_indexed")}
       >Last Indexed{sortIndicator("last_indexed")}</button
      ></th
     >
    </tr>
   </thead>
   <tbody>
    {#each sortedSources as source}
     <tr>
      <td>
       <span class="source-tag {sourceColorClass(source.source)}">{displaySource(source.source)}</span>
      </td>
      <td class="num">{source.file_count}</td>
      <td class="num">{source.chunk_count}</td>
      <td>
       <span class="timestamp">{formatTimestamp(source.last_indexed)}</span>
       <span class="time-ago">{timeAgo(source.last_indexed)}</span>
      </td>
     </tr>
    {/each}
   </tbody>
   <tfoot>
    <tr>
     <td><strong>Total</strong></td>
     <td class="num"><strong>{health.sources.reduce((n, s) => n + s.file_count, 0)}</strong></td>
     <td class="num"><strong>{health.total_chunks}</strong></td>
     <td></td>
    </tr>
   </tfoot>
  </table>
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

 .status-page {
  max-width: 960px;
  margin: 0 auto;
  padding-top: 30px;
 }

 .status-msg {
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
 }

 .status-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
 }

 .status-badge {
  font-size: 16px;
  font-weight: 700;
  padding: 4px 12px;
 }

 .status-badge.ok {
  background: var(--success);
  color: #ffffff;
 }

 .status-badge.err {
  background: var(--error);
  color: #ffffff;
 }

 .refresh-btn {
  font-size: 16px;
  padding: 8px 16px;
  background: var(--bg-surface);
  border: 2px solid var(--border-strong);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s;
 }

 .refresh-btn:hover {
  background: var(--bg-hover);
 }

 .refresh-btn:disabled {
  opacity: 0.5;
  cursor: default;
 }

 .source-table {
  border-collapse: collapse;
  font-size: 16px;
  width: max-content;
 }

 .source-table th {
  text-align: left;
  font-weight: 700;
  padding: 12px 25px 12px 0;
  border-bottom: 2px solid var(--border-strong);
 }

 .sort-btn {
  background: none;
  border: none;
  font: inherit;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
 }

 .sort-btn:hover {
  text-decoration: underline;
 }

 .sort-btn-right {
  display: block;
  margin-left: auto;
  text-align: right;
 }

 .source-table td {
  padding: 12px 25px 12px 0;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
 }

 .source-table tfoot td {
  border-bottom: none;
  border-top: 2px solid var(--border-strong);
  padding-top: 12px;
 }

 .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  width: 1%;
  white-space: nowrap;
 }

 .source-tag {
  font-size: 16px;
  font-weight: bold;
  padding: 2px 8px;
  white-space: nowrap;
 }

 .timestamp {
  font-size: 16px;
  white-space: nowrap;
 }

 .time-ago {
  font-size: 14px;
  color: var(--text-muted);
  margin-left: 8px;
  white-space: nowrap;
 }

 @media (max-width: 640px) {
  .source-table {
   font-size: 14px;
  }
  .source-tag {
   font-size: 14px;
  }
  .timestamp {
   font-size: 14px;
  }
  .time-ago {
   display: none;
  }
  .source-table th,
  .source-table td {
   padding: 8px 8px 8px 0;
  }
 }
</style>
