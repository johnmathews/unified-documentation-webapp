<script lang="ts">
 import { onMount } from "svelte";
 import {
  anchorFromSelection,
  applyHighlights,
  loadHighlights,
  removeHighlight,
  saveHighlight,
 } from "$lib/highlights";
 import { toasts } from "$lib/toasts.svelte";

 interface Props {
  docId: string;
  rootSelector?: string;
 }

 let { docId, rootSelector = ".markdown-content" }: Props = $props();

 let mode: "hidden" | "create" | "remove" = $state("hidden");
 let x = $state(0);
 let y = $state(0);
 let removeTargetId = $state<string | null>(null);

 function getRoot(): HTMLElement | null {
  return document.querySelector(rootSelector);
 }

 function positionAboveRect(rect: DOMRect) {
  const scrollEl = document.querySelector(".content") as HTMLElement | null;
  const scrollTop = scrollEl?.scrollTop ?? 0;
  const offsetTop = scrollEl?.getBoundingClientRect().top ?? 0;
  x = rect.left + rect.width / 2;
  y = rect.top - offsetTop + scrollTop - 8;
 }

 function onSelectionChange() {
  const sel = document.getSelection();
  const root = getRoot();
  if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
   if (mode === "create") mode = "hidden";
   return;
  }
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
   if (mode === "create") mode = "hidden";
   return;
  }
  if (range.toString().trim().length < 2) {
   if (mode === "create") mode = "hidden";
   return;
  }
  const rect = range.getBoundingClientRect();
  positionAboveRect(rect);
  mode = "create";
  removeTargetId = null;
 }

 function onMarkClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const mark = target?.closest("mark.hl-mark") as HTMLElement | null;
  if (!mark) return;
  event.preventDefault();
  event.stopPropagation();
  const id = mark.dataset.hlId ?? null;
  if (!id) return;
  removeTargetId = id;
  positionAboveRect(mark.getBoundingClientRect());
  mode = "remove";
 }

 function onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest(".hl-popover")) return;
  if (target?.closest("mark.hl-mark")) return;
  if (mode === "remove") mode = "hidden";
 }

 function createHighlight() {
  const root = getRoot();
  const sel = document.getSelection();
  if (!root || !sel) return;
  const anchor = anchorFromSelection(root, sel);
  if (!anchor) {
   toasts.add({
    message: "Cannot highlight across blocks or code",
    kind: "neutral",
    ttlMs: 2500,
   });
   mode = "hidden";
   return;
  }
  saveHighlight(docId, anchor);
  applyHighlights(root, loadHighlights(docId));
  sel.removeAllRanges();
  mode = "hidden";
  toasts.add({ message: "Highlight saved", kind: "success", ttlMs: 3000 });
 }

 function removeMark() {
  if (!removeTargetId) return;
  removeHighlight(docId, removeTargetId);
  const root = getRoot();
  if (root) applyHighlights(root, loadHighlights(docId));
  mode = "hidden";
  removeTargetId = null;
  toasts.add({ message: "Highlight removed", kind: "neutral", ttlMs: 2500 });
 }

 onMount(() => {
  document.addEventListener("selectionchange", onSelectionChange);
  document.addEventListener("click", onMarkClick, true);
  document.addEventListener("click", onDocumentClick);
  return () => {
   document.removeEventListener("selectionchange", onSelectionChange);
   document.removeEventListener("click", onMarkClick, true);
   document.removeEventListener("click", onDocumentClick);
  };
 });
</script>

{#if mode !== "hidden"}
 <div
  class="hl-popover"
  style="left: {x}px; top: {y}px;"
  role="dialog"
  aria-label={mode === "create" ? "Highlight selection" : "Remove highlight"}
 >
  {#if mode === "create"}
   <button type="button" class="hl-popover__btn" onclick={createHighlight}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
     <path d="M12 20h9" />
     <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
    Highlight
   </button>
  {:else}
   <button type="button" class="hl-popover__btn hl-popover__btn--remove" onclick={removeMark}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
     <polyline points="3 6 5 6 21 6" />
     <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
    Remove
   </button>
  {/if}
 </div>
{/if}

<style>
 .hl-popover {
  position: absolute;
  transform: translate(-50%, -100%);
  z-index: 60;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 4px;
  display: flex;
  gap: 4px;
 }

 .hl-popover__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
 }

 .hl-popover__btn:hover {
  background: var(--bg-hover);
  color: var(--brand);
 }

 .hl-popover__btn--remove:hover {
  color: #d4351c;
 }

 .hl-popover__btn svg {
  flex-shrink: 0;
 }

 @media print {
  .hl-popover {
   display: none;
  }
 }
</style>
