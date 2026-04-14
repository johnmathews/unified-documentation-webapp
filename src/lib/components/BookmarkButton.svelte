<script lang="ts">
 import { addBookmark, removeBookmark } from "$lib/api";

 interface Props {
  docId: string;
  bookmarked: boolean;
  size?: "small" | "normal";
  onToggle?: (bookmarked: boolean) => void;
 }

 let { docId, bookmarked = $bindable(), size = "normal", onToggle }: Props = $props();

 let toggling = $state(false);

 async function toggle(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
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
   onToggle?.(bookmarked);
  } catch {
   // Silently fail — button state unchanged
  } finally {
   toggling = false;
  }
 }
</script>

<button
 class="bookmark-btn"
 class:bookmarked
 class:small={size === "small"}
 disabled={toggling}
 onclick={toggle}
 title={bookmarked ? "Remove bookmark" : "Add bookmark"}
 aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
>
 {#if bookmarked}
  <svg viewBox="0 0 24 24" fill="currentColor" class="bookmark-icon"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
 {:else}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bookmark-icon"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
 {/if}
</button>

<style>
 .bookmark-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  color: var(--text-secondary);
  transition: color 0.15s, opacity 0.15s;
  flex-shrink: 0;
 }

 .bookmark-btn:hover {
  color: var(--brand);
 }

 .bookmark-btn.bookmarked {
  color: var(--brand);
 }

 .bookmark-btn:disabled {
  opacity: 0.5;
  cursor: default;
 }

 .bookmark-icon {
  width: 20px;
  height: 20px;
 }

 .small .bookmark-icon {
  width: 16px;
  height: 16px;
 }

 .small {
  padding: 2px;
 }
</style>
