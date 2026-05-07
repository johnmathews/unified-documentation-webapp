<script lang="ts">
 import { onMount } from "svelte";
 import { currentDocId, currentDocToc, type TocEntry } from "$lib/stores.svelte";

 let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

 let activeSlug = $state<string | null>(null);
 let observer: IntersectionObserver | null = null;
 let observedSlugs: string[] = [];

 let entries = $derived(currentDocToc.value);
 let docId = $derived(currentDocId.value);

 // Reset active highlight + reattach observer whenever the doc or its TOC changes.
 $effect(() => {
  // Touch reactive deps so the effect re-runs.
  void docId;
  const list = entries;
  if (list.length === 0) {
   teardownObserver();
   activeSlug = null;
   return;
  }
  // Defer one frame so the doc page has rendered the headings into the DOM.
  const handle = requestAnimationFrame(() => attachObserver(list));
  return () => {
   cancelAnimationFrame(handle);
   teardownObserver();
  };
 });

 function attachObserver(list: TocEntry[]) {
  teardownObserver();
  const root = document.querySelector<HTMLElement>(".content");
  const targets = list
   .map((e) => document.getElementById(e.slug))
   .filter((el): el is HTMLElement => el !== null);
  if (targets.length === 0) return;

  observedSlugs = targets.map((el) => el.id);
  // Default highlight to the first heading until the observer fires.
  activeSlug = observedSlugs[0] ?? null;

  observer = new IntersectionObserver(
   (changes) => {
    // Pick the entry closest to the top that is currently intersecting.
    let bestId: string | null = null;
    let bestTop = Number.POSITIVE_INFINITY;
    for (const c of changes) {
     if (c.isIntersecting) {
      const top = c.boundingClientRect.top;
      if (top < bestTop) {
       bestTop = top;
       bestId = (c.target as HTMLElement).id;
      }
     }
    }
    if (bestId) {
     activeSlug = bestId;
    } else {
     // Nothing intersecting: pick the last heading above the viewport.
     const root = document.querySelector<HTMLElement>(".content");
     if (!root) return;
     const scrollTop = root.scrollTop;
     let aboveId: string | null = null;
     for (const id of observedSlugs) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.offsetTop - root.offsetTop <= scrollTop + 1) {
       aboveId = id;
      } else {
       break;
      }
     }
     if (aboveId) activeSlug = aboveId;
    }
   },
   {
    root,
    // Treat headings as "active" when they enter the top portion of the viewport.
    rootMargin: "0px 0px -70% 0px",
    threshold: [0, 1],
   },
  );
  for (const t of targets) observer.observe(t);
 }

 function teardownObserver() {
  if (observer) {
   observer.disconnect();
   observer = null;
  }
  observedSlugs = [];
 }

 onMount(() => {
  return () => teardownObserver();
 });

 function jumpTo(slug: string, ev: MouseEvent) {
  const el = document.getElementById(slug);
  const root = document.querySelector<HTMLElement>(".content");
  if (!el || !root) return;
  const top = el.offsetTop - root.offsetTop - 12;
  root.scrollTo({ top, behavior: "smooth" });
  activeSlug = slug;
  // Drop focus from the TOC button so the sidebar can be aria-hidden when closed.
  (ev.currentTarget as HTMLElement | null)?.blur();
  onNavigate();
 }
</script>

<div class="toc-panel">
 {#if !docId}
  <p class="toc-empty">Open a document to see its table of contents.</p>
 {:else if entries.length === 0}
  <p class="toc-empty">This document has no headings.</p>
 {:else}
  <nav class="toc-list" aria-label="Table of contents">
   {#each entries as entry (entry.slug)}
    <button
     class="toc-item"
     class:level-1={entry.level === 1}
     class:level-2={entry.level === 2}
     class:level-3={entry.level === 3}
     class:active={activeSlug === entry.slug}
     onclick={(ev) => jumpTo(entry.slug, ev)}
     title={entry.text}
    >
     {entry.text}
    </button>
   {/each}
  </nav>
 {/if}
</div>

<style>
 .toc-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0 20px;
 }

 .toc-empty {
  padding: 20px 15px;
  color: var(--text-secondary);
  font-size: 14px;
  font-style: italic;
 }

 .toc-list {
  display: flex;
  flex-direction: column;
 }

 .toc-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-left: 4px solid transparent;
  color: var(--text);
  font-size: 14px;
  line-height: 1.4;
  padding: 6px 15px 6px 11px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.1s, border-color 0.1s, color 0.1s;
 }

 .toc-item:hover {
  background: var(--bg-hover);
 }

 .toc-item.level-1 {
  font-weight: 700;
  font-size: 15px;
  padding-left: 11px;
 }

 .toc-item.level-2 {
  padding-left: 27px;
  color: var(--text);
 }

 .toc-item.level-3 {
  padding-left: 43px;
  color: var(--text-secondary);
  font-size: 13px;
 }

 .toc-item.active {
  border-left-color: var(--brand);
  background: var(--bg-body);
  color: var(--text);
  font-weight: 700;
 }

 @media (max-width: 768px) {
  .toc-item {
   font-size: 16px;
   min-height: 44px;
   padding-top: 10px;
   padding-bottom: 10px;
  }
  .toc-item.level-3 {
   font-size: 14px;
  }
 }
</style>
