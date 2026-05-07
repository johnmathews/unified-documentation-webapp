<script lang="ts">
 import { onMount } from "svelte";
 import { currentDocId, currentDocToc, type TocEntry } from "$lib/stores.svelte";

 let activeSlug = $state<string | null>(null);
 let observer: IntersectionObserver | null = null;
 let observedSlugs: string[] = [];

 let entries = $derived(currentDocToc.value);
 let docId = $derived(currentDocId.value);

 $effect(() => {
  void docId;
  const list = entries;
  if (list.length === 0) {
   teardownObserver();
   activeSlug = null;
   return;
  }
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
  activeSlug = observedSlugs[0] ?? null;

  observer = new IntersectionObserver(
   (changes) => {
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
     const scroller = document.querySelector<HTMLElement>(".content");
     if (!scroller) return;
     const scrollTop = scroller.scrollTop;
     let aboveId: string | null = null;
     for (const id of observedSlugs) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.offsetTop - scroller.offsetTop <= scrollTop + 1) {
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
  (ev.currentTarget as HTMLElement | null)?.blur();
 }
</script>

{#if entries.length > 0}
 <nav class="doc-toc" aria-label="Table of contents">
  <div class="doc-toc-label">On this page</div>
  <div class="doc-toc-list">
   {#each entries as entry (entry.slug)}
    <button
     class="doc-toc-item"
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
  </div>
 </nav>
{/if}

<style>
 .doc-toc {
  position: sticky;
  top: 0;
  width: 240px;
  max-height: calc(100vh - var(--header-height) - 40px);
  overflow-y: auto;
  padding: 4px 0 20px;
  font-size: 14px;
 }

 .doc-toc-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  padding: 0 12px 8px;
 }

 .doc-toc-list {
  display: flex;
  flex-direction: column;
 }

 .doc-toc-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.4;
  padding: 5px 12px 5px 9px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.1s, border-color 0.1s, background 0.1s;
 }

 .doc-toc-item:hover {
  color: var(--text);
  background: var(--bg-hover);
 }

 .doc-toc-item.level-1 {
  font-weight: 700;
  color: var(--text);
  padding-left: 9px;
 }

 .doc-toc-item.level-2 {
  padding-left: 21px;
 }

 .doc-toc-item.level-3 {
  padding-left: 33px;
  font-size: 13px;
 }

 .doc-toc-item.active {
  border-left-color: var(--brand);
  color: var(--text);
  font-weight: 700;
 }

 @media print {
  .doc-toc {
   display: none;
  }
 }
</style>
