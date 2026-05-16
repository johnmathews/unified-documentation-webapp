<script lang="ts">
 import { toasts } from "$lib/toasts.svelte";
 import { fly, fade } from "svelte/transition";
</script>

<div class="toaster" role="region" aria-label="Notifications">
 {#each toasts.items as toast (toast.id)}
  <div
   class="toast toast--{toast.kind}"
   role="status"
   aria-live="polite"
   in:fly={{ y: -6, duration: 180 }}
   out:fade={{ duration: 150 }}
  >
   <span class="toast__text">{toast.message}</span>
   {#if toast.dismissable}
    <button
     type="button"
     class="toast__close"
     onclick={() => toasts.dismiss(toast.id)}
     aria-label="Dismiss notification"
     title="Dismiss"
    >✕</button>
   {/if}
  </div>
 {/each}
</div>

<style>
 .toaster {
  position: fixed;
  top: calc(var(--header-height, 80px) + 8px);
  right: 30px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(360px, calc(100vw - 60px));
  pointer-events: none;
 }

 .toast {
  pointer-events: auto;
  background: var(--bg-surface);
  color: var(--text);
  border-left: 4px solid var(--brand);
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  padding: 10px 10px 10px 14px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 12px;
 }

 .toast--success {
  border-left-color: #00703c;
 }

 .toast--neutral {
  border-left-color: var(--border-strong);
 }

 .toast--error {
  border-left-color: #d4351c;
 }

 .toast__text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
 }

 .toast__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  margin: -2px -4px -2px 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  border-radius: 4px;
 }

 .toast__close:hover {
  color: var(--text);
  background: var(--bg-hover);
 }

 /* Divergent: dark toast surface — swaps to GOV.UK yellow-fill instead of
    the standard outline, so the focus indicator is visible on the dark bg. */
 .toast__close:focus {
  color: var(--focus-text);
  background: var(--focus);
  outline: none;
 }

 @media (max-width: 640px) {
  .toaster {
   left: 8px;
   right: 8px;
   max-width: none;
  }
 }

 @media print {
  .toaster {
   display: none;
  }
 }
</style>
