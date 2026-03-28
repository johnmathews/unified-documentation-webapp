<script lang="ts">
 import { sendChat, type ChatMessage } from "$lib/api";
 import { tick } from "svelte";
 import { browser } from "$app/environment";
 import { marked } from "marked";

 let {
  docId = null,
  expanded = false,
  onToggleExpand = () => {},
 }: {
  docId: string | null;
  expanded?: boolean;
  onToggleExpand?: () => void;
 } = $props();

 const STORAGE_KEY = "doc-chat-messages";
 const PREV_STORAGE_KEY = "doc-chat-messages-prev";

 let messages: ChatMessage[] = $state([]);
 let input = $state("");
 let sending = $state(false);
 let messagesEl: HTMLDivElement | undefined = $state();
 let textareaEl: HTMLTextAreaElement | undefined = $state();
 let confirmingClear = $state(false);
 let hasPrevious = $state(false);
 let hydrated = false;
 let editingIndex: number | null = $state(null);

 // Load from localStorage on mount (browser only)
 $effect(() => {
  if (!browser) return;
  try {
   const stored = localStorage.getItem(STORAGE_KEY);
   if (stored) messages = JSON.parse(stored);
  } catch {
   /* ignore */
  }
  hasPrevious = !!localStorage.getItem(PREV_STORAGE_KEY);
  hydrated = true;
 });

 // Persist messages to localStorage on change (browser only)
 $effect(() => {
  if (!browser) return;
  void messages.length;
  if (!hydrated) return;
  try {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
   /* quota exceeded — ignore */
  }
 });

 async function handleSubmit(e: Event) {
  e.preventDefault();
  const msg = input.trim();
  if (!msg || sending) return;

  // If editing, truncate from the edited message onward on submit
  if (editingIndex !== null) {
   messages = messages.slice(0, editingIndex);
   editingIndex = null;
  }

  input = "";
  messages.push({ role: "user", content: msg });
  sending = true;
  await scrollToBottom();

  try {
   const reply = await sendChat(msg, docId ?? undefined, messages.slice(0, -1));
   messages.push({ role: "assistant", content: reply });
  } catch (err) {
   messages.push({
    role: "assistant",
    content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
   });
  } finally {
   sending = false;
   await scrollToBottom();
  }
 }

 async function startEdit(index: number) {
  if (sending) return;
  editingIndex = index;
  input = messages[index].content;
  await tick();
  textareaEl?.focus();
 }

 function cancelEdit() {
  editingIndex = null;
  input = "";
 }

 async function scrollToBottom() {
  await tick();
  if (messagesEl) {
   messagesEl.scrollTop = messagesEl.scrollHeight;
  }
 }

 function clearChat() {
  try {
   localStorage.setItem(PREV_STORAGE_KEY, JSON.stringify(messages));
  } catch {
   /* ignore */
  }
  messages = [];
  confirmingClear = false;
  hasPrevious = true;
 }

 function restorePrevious() {
  try {
   const stored = localStorage.getItem(PREV_STORAGE_KEY);
   if (stored) {
    messages = JSON.parse(stored);
    localStorage.removeItem(PREV_STORAGE_KEY);
    hasPrevious = false;
   }
  } catch {
   /* ignore */
  }
 }

 function cancelClear() {
  confirmingClear = false;
 }

 function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
 }
</script>

<div class="chat-container">
 <div class="chat-header">
  <h3>Chat</h3>
  {#if docId}
   <span class="context-badge" title={docId}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
     <circle cx="12" cy="12" r="10" />
     <line x1="12" y1="16" x2="12" y2="12" />
     <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    Page context
   </span>
  {/if}
  <div class="header-actions">
   {#if confirmingClear}
    <span class="confirm-clear">
     <span class="confirm-label">Clear?</span>
     <button class="header-btn confirm-yes" onclick={clearChat} title="Confirm clear">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <polyline points="20 6 9 17 4 12" />
      </svg>
     </button>
     <button class="header-btn confirm-no" onclick={cancelClear} title="Cancel">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
     </button>
    </span>
   {:else if messages.length > 0}
    <button class="header-btn" onclick={() => (confirmingClear = true)} title="Clear chat">
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
     </svg>
    </button>
   {:else if hasPrevious}
    <button class="header-btn" onclick={restorePrevious} title="Restore previous chat">
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
     </svg>
    </button>
   {/if}
   <button class="header-btn expand-btn" onclick={onToggleExpand} title={expanded ? "Collapse" : "Expand"}>
    {#if expanded}
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line
       x1="14"
       y1="10"
       x2="21"
       y2="3"
      /><line x1="3" y1="21" x2="10" y2="14" />
     </svg>
    {:else}
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line
       x1="21"
       y1="3"
       x2="14"
       y2="10"
      /><line x1="3" y1="21" x2="10" y2="14" />
     </svg>
    {/if}
   </button>
  </div>
 </div>

 <div class="messages" bind:this={messagesEl}>
  {#if messages.length === 0}
   <div class="empty-state">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <p>Ask questions about the documentation.</p>
    {#if hasPrevious}
     <button class="restore-hint" onclick={restorePrevious}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
      Restore previous chat
     </button>
    {:else if docId}
     <p class="context-hint">The assistant can see the page you're viewing.</p>
    {/if}
   </div>
  {:else}
   {#each messages as msg, i}
    <div
     class="message"
     class:user={msg.role === "user"}
     class:assistant={msg.role === "assistant"}
     class:editing={editingIndex === i}
     class:will-remove={editingIndex !== null && i > editingIndex}
    >
     <div class="message-bubble" class:markdown-content={msg.role === "assistant"}>
      {#if msg.role === "assistant"}
       {@html renderMarkdown(msg.content)}
      {:else}
       {msg.content}
      {/if}
     </div>
     {#if msg.role === "user" && !sending}
      <button class="edit-btn" onclick={() => startEdit(i)} title="Edit message">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
       </svg>
      </button>
     {/if}
    </div>
   {/each}
   {#if sending}
    <div class="message assistant">
     <div class="message-bubble typing">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
     </div>
    </div>
   {/if}
  {/if}
 </div>

 {#if editingIndex !== null}
  <div class="edit-bar">
   <span class="edit-label">Editing message</span>
   <button class="edit-cancel-btn" onclick={cancelEdit}>Cancel</button>
  </div>
 {/if}
 <form class="chat-input" onsubmit={handleSubmit}>
  <textarea
   bind:this={textareaEl}
   placeholder="Ask about the docs..."
   bind:value={input}
   disabled={sending}
   rows="1"
   onkeydown={(e) => {
    if (e.key === "Escape" && editingIndex !== null) {
     cancelEdit();
     return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
     e.preventDefault();
     if (input.trim() && !sending) handleSubmit(e);
    }
   }}
   oninput={(e) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
   }}
  ></textarea>
  <button type="submit" disabled={sending || !input.trim()} class="send-btn" title="Send message">
   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
   </svg>
  </button>
 </form>
</div>

<style>
 .chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface);
 }

 .chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
 }

 .chat-header h3 {
  font-size: 19px;
  font-weight: 700;
  margin: 0;
  color: var(--text);
 }

 .context-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: var(--success);
  background: var(--bg-body);
  padding: 2px 8px;
  border-radius: 0;
  border: 1px solid var(--border);
  flex-shrink: 0;
 }

 .header-actions {
  margin-left: auto;
  display: flex;
  gap: 5px;
 }

 .header-btn {
  padding: 5px;
  background: none;
  border: none;
  color: var(--text-secondary);
  border-radius: 0;
 }

 .header-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
 }

 .confirm-clear {
  display: flex;
  align-items: center;
  gap: 5px;
 }

 .confirm-label {
  font-size: 14px;
  color: var(--text-muted);
  margin-right: 5px;
 }

 .confirm-yes:hover {
  color: var(--error);
 }

 .confirm-no:hover {
  color: var(--text);
 }

 .messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
 }

 .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  padding: 40px;
 }

 .empty-state p {
  font-size: 16px;
 }

 .context-hint {
  font-size: 14px;
  color: var(--text-muted);
 }

 .restore-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: var(--link);
  background: none;
  border: 2px solid var(--border-strong);
  border-radius: 0;
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.15s;
 }

 .restore-hint:hover {
  background: var(--bg-hover);
 }

 .message {
  display: flex;
 }

 .message.user {
  flex-direction: column;
  align-items: flex-end;
 }

 .message-bubble {
  max-width: 85%;
  padding: 15px;
  border-radius: 0;
  font-size: 16px;
  line-height: 1.3157894737;
  word-break: break-word;
 }

 .user .message-bubble {
  background: var(--brand);
  color: white;
 }

 .assistant .message-bubble {
  background: var(--bg-body);
  color: var(--text);
  border: none;
  border-left: 5px solid var(--border);
  padding: 15px;
 }

 /* Compact markdown overrides for chat bubbles */
 .message-bubble :global(p:first-child) {
  margin-top: 0;
 }
 .message-bubble :global(p:last-child) {
  margin-bottom: 0;
 }
 .message-bubble :global(p) {
  margin: 10px 0;
 }
 .message-bubble :global(h1),
 .message-bubble :global(h2),
 .message-bubble :global(h3) {
  font-size: 16px;
  font-weight: 700;
  margin: 15px 0 5px;
 }
 .message-bubble :global(ul),
 .message-bubble :global(ol) {
  margin: 5px 0;
  padding-left: 20px;
 }
 .message-bubble :global(li) {
  margin: 5px 0;
 }
 .message-bubble :global(pre) {
  margin: 10px 0;
  padding: 10px 15px;
  font-size: 0.8em;
  overflow-x: auto;
  background: var(--bg-code);
 }
 .message-bubble :global(blockquote) {
  margin: 10px 0;
  padding-left: 15px;
  border-left: 5px solid var(--border);
 }

 .typing {
  display: flex;
  gap: 5px;
  padding: 15px 20px;
 }

 .dot {
  width: 6px;
  height: 6px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: bounce 1.2s infinite;
 }

 .dot:nth-child(2) {
  animation-delay: 0.2s;
 }
 .dot:nth-child(3) {
  animation-delay: 0.4s;
 }

 @keyframes bounce {
  0%,
  80%,
  100% {
   transform: translateY(0);
  }
  40% {
   transform: translateY(-4px);
  }
 }

 .chat-input {
  display: flex;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
 }

 .chat-input textarea {
  flex: 1;
  padding: 10px 15px;
  background: var(--bg-body);
  border: 2px solid var(--border-strong);
  border-radius: 0;
  color: var(--text);
  font-size: 16px;
  font-family: inherit;
  outline: none;
  resize: none;
  overflow-y: hidden;
  line-height: 1.4;
 }

 .chat-input textarea:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  box-shadow: inset 0 0 0 2px var(--border-strong);
 }

 .chat-input textarea::placeholder {
  color: var(--text-muted);
 }

 .send-btn {
  padding: 8px 15px 5px;
  background: var(--success);
  border: 2px solid transparent;
  border-radius: 0;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 0 #083d29;
  font-weight: 700;
  cursor: pointer;
 }

 .send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
 }

 .send-btn:not(:disabled):hover {
  background: #0b5c3e;
 }

 .send-btn:not(:disabled):active {
  top: 3px;
  box-shadow: none;
  position: relative;
 }

 .send-btn:focus:not(:active) {
  border-color: var(--focus);
  color: var(--focus-text);
  background: var(--focus);
  box-shadow: 0 3px 0 var(--focus-text);
 }

 .edit-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  margin-top: 2px;
 }

 .edit-btn:hover {
  color: var(--text);
 }

 .message.user:hover .edit-btn {
  opacity: 1;
 }

 .message.editing .message-bubble {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
 }

 .message.will-remove {
  opacity: 0.4;
 }

 .edit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 15px;
  background: var(--accent-dim);
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-secondary);
 }

 .edit-label {
  font-weight: 700;
 }

 .edit-cancel-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
 }

 .edit-cancel-btn:hover {
  color: var(--text);
 }

 @media (max-width: 768px) {
  .chat-header h3 {
   font-size: 19px;
  }
  .context-badge {
   font-size: 14px;
  }
  .header-btn {
   min-height: 44px;
   min-width: 44px;
   padding: 10px;
  }
  .header-btn.expand-btn {
   display: none;
  }
  .confirm-label {
   font-size: 14px;
  }
  .send-btn {
   min-height: 44px;
   min-width: 44px;
  }
  .message-bubble {
   font-size: 16px;
  }
  .chat-input textarea {
   min-height: 44px;
   font-size: 16px; /* Explicit 16px prevents iOS Safari auto-zoom on focus */
  }
  .empty-state p {
   font-size: 16px;
  }
  .context-hint {
   font-size: 14px;
  }
  .restore-hint {
   min-height: 44px;
   padding: 10px 20px;
   font-size: 16px;
  }
  .chat-input {
   padding-bottom: calc(15px + env(safe-area-inset-bottom, 0));
  }
 }
</style>
