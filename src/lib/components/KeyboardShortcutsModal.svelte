<script lang="ts">
 interface Props {
  open: boolean;
  onClose: () => void;
 }

 let { open, onClose }: Props = $props();

 const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
 const mod = isMac ? "⌘" : "Ctrl";

 const shortcuts: { keys: string[]; description: string }[] = [
  { keys: [mod, "B"], description: "Toggle Files panel" },
  { keys: [mod, "K"], description: "Toggle Search panel" },
  { keys: [mod, "J"], description: "Go to Chat" },
  { keys: [mod, "."], description: "Toggle table of contents" },
  { keys: ["?"], description: "Show this shortcuts dialog" },
  { keys: ["Esc"], description: "Close panel or dialog" },
 ];
</script>

{#if open}
 <div
  class="modal-backdrop"
  role="dialog"
  aria-modal="true"
  aria-labelledby="shortcuts-title"
  tabindex="-1"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  onkeydown={(e) => { if (e.key === "Escape") onClose(); }}
 >
  <div class="modal">
   <header class="modal-header">
    <h2 id="shortcuts-title">Keyboard shortcuts</h2>
    <button class="close-btn" onclick={onClose} aria-label="Close">
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
     </svg>
    </button>
   </header>
   <ul class="shortcut-list">
    {#each shortcuts as item (item.description)}
     <li class="shortcut-row">
      <span class="shortcut-keys">
       {#each item.keys as k, i (i)}
        {#if i > 0}<span class="key-plus">+</span>{/if}
        <kbd>{k}</kbd>
       {/each}
      </span>
      <span class="shortcut-desc">{item.description}</span>
     </li>
    {/each}
   </ul>
  </div>
 </div>
{/if}

<style>
 .modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--backdrop);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 150ms ease;
  padding: 20px;
 }

 @keyframes fadeIn {
  from {
   opacity: 0;
  }
  to {
   opacity: 1;
  }
 }

 .modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  width: 100%;
  max-width: 460px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
 }

 .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
 }

 .modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
 }

 .close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  width: 32px;
  height: 32px;
 }

 .close-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
 }

 .shortcut-list {
  list-style: none;
  margin: 0;
  padding: 12px 0;
 }

 .shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 20px;
 }

 .shortcut-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
 }

 .shortcut-keys kbd {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  padding: 2px 8px;
  min-width: 22px;
  text-align: center;
  color: var(--text);
 }

 .key-plus {
  color: var(--text-secondary);
  font-size: 13px;
 }

 .shortcut-desc {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: right;
 }

 @media (max-width: 480px) {
  .shortcut-row {
   flex-direction: column;
   align-items: flex-start;
   gap: 4px;
  }
  .shortcut-desc {
   text-align: left;
  }
 }
</style>
