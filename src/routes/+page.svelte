<script lang="ts">
 import { fetchTree, fetchHealth, type TreeSource, type TreeDocument, type HealthStatus, type HealthSource } from "$lib/api";
 import { currentDocId } from "$lib/stores.svelte";
 import { displaySource } from "$lib/titles";

 let tree: TreeSource[] = $state([]);
 let health: HealthStatus | null = $state(null);
 let loading = $state(true);
 let error = $state("");

 type SortCol = "project" | "status" | "date" | "count";
 let sortCol: SortCol = $state("date");
 let sortAsc = $state(false);

 const statusOrder: Record<string, number> = { error: 0, warning: 1, unknown: 2, healthy: 3 };

 let healthBySource = $derived.by(() => {
  const map: Record<string, HealthSource> = {};
  if (health) for (const s of health.sources) map[s.source] = s;
  return map;
 });

 function toggleSort(col: SortCol) {
  if (sortCol === col) {
   sortAsc = !sortAsc;
  } else {
   sortCol = col;
   sortAsc = col === "project" || col === "status"; // default asc for project/status, desc for others
  }
 }

 let sortedTree = $derived.by(() => {
  const copy = [...tree];
  const dir = sortAsc ? 1 : -1;
  copy.sort((a, b) => {
   if (sortCol === "project") {
    return dir * displaySource(a.source).localeCompare(displaySource(b.source));
   } else if (sortCol === "status") {
    const sa = healthBySource[a.source]?.source_status ?? "unknown";
    const sb = healthBySource[b.source]?.source_status ?? "unknown";
    return dir * ((statusOrder[sa] ?? 2) - (statusOrder[sb] ?? 2));
   } else if (sortCol === "date") {
    const da = lastUpdated(a) ?? "";
    const db = lastUpdated(b) ?? "";
    return dir * da.localeCompare(db);
   } else {
    return dir * (docCount(a) - docCount(b));
   }
  });
  return copy;
 });

 $effect(() => {
  currentDocId.value = null;
  loadData();
 });

 async function loadData() {
  try {
   const [treeResult, healthResult] = await Promise.all([
    fetchTree(),
    fetchHealth().catch(() => null),
   ]);
   tree = treeResult;
   health = healthResult;
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
  }
 }

 function allDocs(source: TreeSource): TreeDocument[] {
  return [
   ...source.root_docs,
   ...source.docs,
   ...source.journal,
   ...(source.learning_journal ?? []),
   ...(source.engineering_team ?? []),
   ...(source.pdf ?? []),
  ];
 }

 function docCount(source: TreeSource): number {
  return allDocs(source).length;
 }

 function lastUpdated(source: TreeSource): string | null {
  let latest: string | null = null;
  for (const doc of allDocs(source)) {
   const date = doc.modified_at ?? doc.created_at;
   if (date && (!latest || date > latest)) latest = date;
  }
  return latest;
 }

 function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
 }

 function timeAgo(iso: string | null): string {
  if (!iso) return "";
  try {
   const diff = Date.now() - new Date(iso).getTime();
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

 function statusLabel(s: string): string {
  if (s === "healthy") return "Healthy";
  if (s === "warning") return "Warning";
  if (s === "error") return "Error";
  return "Unknown";
 }

 function statusTooltip(src: HealthSource): string {
  const s = src.source_status;
  if (s === "healthy") return "Healthy: Last scan succeeded with no errors.";
  if (s === "warning")
   return `Warning: 1 consecutive scan failure or scan is overdue.${src.last_error ? `\n\nLast error: ${src.last_error}` : ""}`;
  if (s === "error")
   return `Error: 2+ consecutive scan failures or scan is severely overdue.${src.last_error ? `\n\nLast error: ${src.last_error}` : ""}`;
  return "Unknown: This source has not been scanned yet.";
 }
</script>

<svelte:head>
 <title>Documentation Library</title>
</svelte:head>

<!-- GOV.UK-style masthead hero -->
<div class="masthead">
 <div class="masthead__inner">
  <h1 class="masthead__title">Documentation Library</h1>
  <p class="masthead__description">
   {tree.length} projects indexed — browse a project or use search and chat.
  </p>
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
  {#if health}
   <a
    class="status-badge"
    class:ok={health.status === "healthy"}
    class:warn={health.status === "degraded"}
    class:err={health.status === "error"}
    href="/status"
    title={health.status === "healthy"
     ? "Healthy: All sources are scanning successfully."
     : health.status === "degraded"
      ? "Degraded: One or more sources have scan failures or are stale."
      : "Error: All sources are failing or unreachable."}>
    {health.status === "healthy" ? "Healthy" : health.status === "degraded" ? "Degraded" : "Error"}
   </a>
  {/if}
  <table class="source-table">
   <thead>
    <tr>
     <th class="sortable" onclick={() => toggleSort("project")}>
      Project <span class="sort-arrow">{sortCol === "project" ? (sortAsc ? "\u25B2" : "\u25BC") : ""}</span>
     </th>
     <th class="col-status sortable" onclick={() => toggleSort("status")}>
      Status <span class="sort-arrow">{sortCol === "status" ? (sortAsc ? "\u25B2" : "\u25BC") : ""}</span>
     </th>
     <th class="col-date sortable" onclick={() => toggleSort("date")}>
      Last updated <span class="sort-arrow">{sortCol === "date" ? (sortAsc ? "\u25B2" : "\u25BC") : ""}</span>
     </th>
     <th class="col-count sortable" onclick={() => toggleSort("count")}>
      Documents <span class="sort-arrow">{sortCol === "count" ? (sortAsc ? "\u25B2" : "\u25BC") : ""}</span>
     </th>
    </tr>
   </thead>
   <tbody>
    {#each sortedTree as source}
     {@const h = healthBySource[source.source]}
     {@const updated = lastUpdated(source)}
     <tr>
      <td>
       <a class="source-link" href="/source/{encodeURIComponent(source.source)}"
        >{displaySource(source.source)}</a
       >
      </td>
      <td class="col-status">
       {#if h}
        <span
         class="src-status"
         class:src-healthy={h.source_status === "healthy"}
         class:src-warning={h.source_status === "warning"}
         class:src-error={h.source_status === "error"}
         class:src-unknown={h.source_status === "unknown"}
         title={statusTooltip(h)}>
         {statusLabel(h.source_status)}
         {#if h.consecutive_failures > 0}
          <span class="failure-count">({h.consecutive_failures})</span>
         {/if}
        </span>
       {/if}
      </td>
      <td class="col-date">
       <span class="date">{formatDate(updated)}</span>
       <span class="time-ago">{timeAgo(updated)}</span>
      </td>
      <td class="col-count">{docCount(source)}</td>
     </tr>
    {/each}
   </tbody>
  </table>
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

 /* GOV.UK-style table */
 .source-table {
  border-collapse: collapse;
  font-size: 1rem;
  line-height: 1.25;
 }

 .source-table thead {
  border-bottom: 2px solid var(--text);
 }

 .source-table th {
  text-align: left;
  font-weight: 700;
  font-size: 1rem;
  padding: 10px 20px 10px 0;
  color: var(--text);
 }

 .sortable {
  cursor: pointer;
  user-select: none;
 }

 .sortable:hover {
  text-decoration: underline;
 }

 .sort-arrow {
  font-size: 0.7rem;
  margin-left: 2px;
  opacity: 0.7;
 }

 .source-table tbody tr {
  border-bottom: 1px solid var(--border);
 }

 .source-table td {
  padding: 15px 20px 15px 0;
  vertical-align: top;
 }

 .source-link {
  font-size: 1.1875rem;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: max(1px, 0.0625rem);
  text-underline-offset: 0.1578em;
 }

 .source-link:hover {
  filter: brightness(1.3);
  text-decoration-thickness: max(3px, 0.1875rem, 0.12em);
 }

 .source-link:focus {
  outline: 3px solid transparent;
  color: var(--focus-text);
  background-color: var(--focus);
  box-shadow:
   0 -2px var(--focus),
   0 4px var(--focus-text);
  text-decoration: none;
 }

 .col-count,
 .col-date,
 .col-status {
  color: var(--text-secondary);
  white-space: nowrap;
 }

 .col-count {
  text-align: right;
 }

 .status-badge {
  display: inline-block;
  font-size: 16px;
  font-weight: 700;
  padding: 4px 12px;
  margin-bottom: 20px;
  text-decoration: none;
 }

 .status-badge.ok {
  background: var(--success);
  color: #ffffff;
 }

 .status-badge.warn {
  background: var(--warning);
  color: #ffffff;
 }

 .status-badge.err {
  background: var(--error);
  color: #ffffff;
 }

 :global([data-theme="dark"]) .status-badge.ok,
 :global([data-theme="dark"]) .status-badge.warn,
 :global([data-theme="dark"]) .status-badge.err {
  color: #1a1a1a;
 }

 .status-badge:hover {
  opacity: 0.9;
 }

 .src-status {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
 }

 .src-healthy {
  color: var(--success);
 }

 .src-warning {
  color: var(--warning);
 }

 .src-error {
  color: var(--error);
 }

 .src-unknown {
  color: var(--text-muted);
 }

 .failure-count {
  font-weight: 400;
  font-size: 12px;
 }

 .time-ago {
  font-size: 14px;
  color: var(--text-muted);
  margin-left: 8px;
 }

 @media (max-width: 640px) {
  .masthead {
   margin: -20px -15px 0;
   padding-left: 15px;
   padding-right: 15px;
  }

  .source-table th,
  .source-table td {
   padding-right: 10px;
  }

  .source-link {
   font-size: 1rem;
  }

  .col-date {
   display: none;
  }

  .time-ago {
   display: none;
  }
 }
</style>
