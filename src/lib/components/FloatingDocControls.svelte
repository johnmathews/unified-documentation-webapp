<script lang="ts">
 import { onMount } from "svelte";
 import { addBookmark, removeBookmark } from "$lib/api";
 import { tocOpen, currentDocToc } from "$lib/stores.svelte";

 interface Props {
  docId: string;
  bookmarked: boolean;
  onToggleBookmark?: (bookmarked: boolean) => void;
 }

 let { docId, bookmarked = $bindable(), onToggleBookmark }: Props = $props();

 let hasToc = $derived(currentDocToc.value.length > 0);
 let isTocOpen = $derived(tocOpen.value);

 let progress = $state(0);
 let toggling = $state(false);
 let scrollEl: HTMLElement | null = null;

 function updateProgress() {
  if (!scrollEl) return;
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  if (max <= 0) {
   progress = 100;
   return;
  }
  const ratio = scrollEl.scrollTop / max;
  progress = Math.max(0, Math.min(100, Math.round(ratio * 100)));
 }

 onMount(() => {
  scrollEl = document.querySelector<HTMLElement>(".content");
  if (!scrollEl) return;
  scrollEl.addEventListener("scroll", updateProgress, { passive: true });
  // Recompute when content size changes (images loading, late layout, etc.).
  const ro = new ResizeObserver(updateProgress);
  ro.observe(scrollEl);
  // First paint may not have measured the document yet.
  requestAnimationFrame(updateProgress);
  return () => {
   scrollEl?.removeEventListener("scroll", updateProgress);
   ro.disconnect();
  };
 });

 async function toggle() {
  if (toggling) return;
  toggling = true;
  try {
   if (bookmarked) {
    await removeBookmark(docId);
    bookmarked = false;
   } else {
    await addBookmark(docId);
    bookmarked = true;
   }
   onToggleBookmark?.(bookmarked);
  } catch {
   /* swallow — keep state */
  } finally {
   toggling = false;
  }
 }
</script>

<div class="floating-controls" role="group" aria-label="Document controls">
 {#if hasToc}
  <button
   class="control-btn"
   class:active={isTocOpen}
   onclick={() => tocOpen.toggle()}
   title={isTocOpen ? "Hide table of contents" : "Show table of contents"}
   aria-label={isTocOpen ? "Hide table of contents" : "Show table of contents"}
   aria-pressed={isTocOpen}
  >
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
   </svg>
  </button>
  <span class="divider" aria-hidden="true"></span>
 {/if}
 <button
  class="control-btn"
  class:active={bookmarked}
  disabled={toggling}
  onclick={toggle}
  title={bookmarked ? "Remove bookmark" : "Add bookmark"}
  aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
 >
  {#if bookmarked}
   <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
    ><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg
   >
  {:else}
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
    ><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg
   >
  {/if}
 </button>
 <span class="divider" aria-hidden="true"></span>
 <span class="progress" aria-label="Reading progress" title="Scroll progress">{progress}%</span>
</div>

<style>
 .floating-controls {
  position: fixed;
  right: 20px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0));
  z-index: 150;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  font-size: 13px;
  color: var(--text-secondary);
 }

 .control-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
 }

 .control-btn:hover {
  color: var(--brand);
  background: var(--bg-hover);
 }

 .control-btn.active {
  color: var(--brand);
 }

 .control-btn:disabled {
  opacity: 0.5;
  cursor: default;
 }

 .control-btn svg {
  width: 16px;
  height: 16px;
 }

 .divider {
  width: 1px;
  height: 18px;
  background: var(--border);
 }

 .progress {
  min-width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--text);
 }

 @media (max-width: 768px) {
  .floating-controls {
   right: 12px;
   bottom: calc(12px + env(safe-area-inset-bottom, 0));
  }
 }

 @media print {
  .floating-controls {
   display: none;
  }
 }
</style>
