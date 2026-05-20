<script lang="ts">
 import {
  streamChat,
  type ChatMessage,
  type PageContext,
 } from "$lib/api";
 import { onMount, tick } from "svelte";
 import { marked } from "marked";
 import { renderMarkdownWithLinks } from "$lib/links";
 import { sanitiseHtml } from "$lib/sanitise";

 let {
  docId = null,
  pageContext = null,
  onConversationChange = () => {},
 }: {
  docId?: string | null;
  pageContext?: PageContext | null;
  /** Fires after a reply lands with the (possibly new) conversation id, so
   * the page's history list can refresh. */
  onConversationChange?: (id: string | null) => void;
 } = $props();

 let hasContext = $derived(!!docId || !!pageContext);
 let contextLabel = $derived(
  docId
   ? "Page context"
   : pageContext?.category
     ? `${pageContext.source} / ${pageContext.category}`
     : pageContext?.source
       ? `${pageContext.source}`
       : "",
 );

 let messages: ChatMessage[] = $state([]);
 let conversationId: string | null = $state(null);
 let input = $state("");
 let sending = $state(false);
 let messagesEl: HTMLDivElement | undefined = $state();
 let textareaEl: HTMLTextAreaElement | undefined = $state();
 let editingIndex: number | null = $state(null);
 let toolProgress: { index: number; tool: string; status: "calling" | "done"; summary?: string }[] = $state([]);

 const toolLabels: Record<string, string> = {
  search_docs: "Searching documentation",
  query_docs: "Querying documents",
  get_document: "Reading document",
  list_sources: "Listing sources",
 };
 function formatToolName(name: string): string {
  return toolLabels[name] || name;
 }

 /** Imperative handle for the parent page: load a stored conversation into
  * the conversation area, or reset to a fresh one. Streaming/markdown stays
  * owned here so the page never duplicates it. */
 export function loadConversation(loaded: ChatMessage[], id: string) {
  messages = loaded;
  conversationId = id;
  editingIndex = null;
  scrollToBottom();
 }

 export function startNewConversation() {
  messages = [];
  conversationId = null;
  editingIndex = null;
  input = "";
  textareaEl?.focus();
 }

 export function isEmpty(): boolean {
  return messages.length === 0;
 }

 onMount(() => {
  textareaEl?.focus();
 });

 async function handleSubmit(e: Event) {
  e.preventDefault();
  const msg = input.trim();
  if (!msg || sending) return;

  // If editing, truncate from the edited message onward on submit
  if (editingIndex !== null) {
   messages = messages.slice(0, editingIndex);
   conversationId = null; // New conversation branch
   editingIndex = null;
  }

  input = "";
  messages.push({ role: "user", content: msg });
  sending = true;
  await scrollToBottom();

  try {
   toolProgress = [];
   await streamChat(
    msg,
    {
     onToolCall: (data) => {
      toolProgress = [...toolProgress, { index: data.index, tool: data.tool, status: "calling" }];
      scrollToBottom();
     },
     onToolResult: (data) => {
      toolProgress = toolProgress.map((t) =>
       t.index === data.index ? { ...t, status: "done" as const, summary: data.summary } : t,
      );
      scrollToBottom();
     },
     onReply: (data) => {
      messages.push({ role: "assistant", content: data.reply });
      conversationId = data.conversation_id;
      toolProgress = [];
      onConversationChange(conversationId);
     },
     onError: (error) => {
      messages.push({ role: "assistant", content: `Error: ${error}` });
      toolProgress = [];
     },
    },
    docId ?? undefined,
    messages.slice(0, -1),
    pageContext ?? undefined,
    conversationId ?? undefined,
   );
  } catch (err) {
   messages.push({
    role: "assistant",
    content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
   });
   toolProgress = [];
  } finally {
   sending = false;
   await scrollToBottom();
   // Return focus to the input so the user can keep typing without
   // clicking back — the textarea is disabled while sending, so wait a
   // tick for it to re-enable before focusing.
   await tick();
   textareaEl?.focus();
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

 function renderMarkdown(content: string): string {
  // When a document is in context, resolve relative links against it.
  // The outer sanitiseHtml() is intentional defence-in-depth — renderMarkdownWithLinks
  // also sanitises internally, but DOMPurify is idempotent (covered by sanitise.test.ts),
  // so a future refactor that touches one path can't accidentally open a hole.
  if (docId) {
   const colonIndex = docId.indexOf(":");
   if (colonIndex !== -1) {
    const source = docId.slice(0, colonIndex);
    const filePath = docId.slice(colonIndex + 1);
    return sanitiseHtml(renderMarkdownWithLinks(content, source, filePath));
   }
  }
  return sanitiseHtml(marked.parse(content, { async: false }) as string);
 }
</script>

<div class="chat-container">
 {#if hasContext}
  <div class="context-bar">
   <span class="context-badge" title={docId ? "The chat assistant can see the document you're currently viewing." : "The chat assistant knows which source you're browsing and can research documents within it."}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
     <circle cx="12" cy="12" r="10" />
     <line x1="12" y1="16" x2="12" y2="12" />
     <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    {contextLabel}
   </span>
  </div>
 {/if}

 <div class="messages" bind:this={messagesEl} aria-live="polite" aria-relevant="additions" aria-atomic="false">
  {#if messages.length === 0}
   <div class="empty-state">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <p>Ask questions about the documentation.</p>
    {#if hasContext}
     <p class="context-hint">{docId ? "The assistant can see the page you're viewing." : "The assistant knows which source you're browsing."}</p>
    {/if}
   </div>
  {:else}
   {#each messages as msg, i (i)}
    <div
     class="message"
     class:user={msg.role === "user"}
     class:assistant={msg.role === "assistant"}
     class:editing={editingIndex === i}
     class:will-remove={editingIndex !== null && i > editingIndex}
    >
     <div class="message-role">{msg.role === "user" ? "You" : "Agent"}</div>
     <div class="message-body" class:markdown-content={msg.role === "assistant"}>
      {#if msg.role === "assistant"}
       <!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
     <div class="message-role">Agent</div>
     <div class="message-body typing-progress">
      {#if toolProgress.length > 0}
       <div class="tool-progress">
        {#each toolProgress as tp (tp.index)}
         <div class="tool-step" class:done={tp.status === "done"}>
          <span class="tool-icon">{tp.status === "done" ? "✓" : "↻"}</span>
          <span class="tool-name">{formatToolName(tp.tool)}</span>
          {#if tp.summary}
           <span class="tool-summary">&mdash; {tp.summary}</span>
          {/if}
         </div>
        {/each}
       </div>
      {/if}
      <div class="thinking-dots">
       <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
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

 .context-bar {
  display: flex;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
 }

 .context-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  line-height: 20px;
  color: var(--success);
  background: var(--bg-body);
  padding: 2px 8px;
  border-radius: 0;
  border: 1px solid var(--border);
  flex-shrink: 0;
 }

 /* Document-style transcript: a single centred reading column, messages
    flow top-to-bottom with a "You" / "Agent" role label above each, no
    bubbles, no left/right alignment. Matches the reading rhythm of the
    doc viewer (≈900px column) so longer answers stay scannable. */
 .messages {
  flex: 1;
  overflow-y: auto;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  gap: 25px;
 }

 .messages > * {
  width: 100%;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
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
  line-height: 20px;
 }

 .context-hint {
  font-size: 14px;
  line-height: 20px;
  color: var(--text-muted);
 }

 .message {
  position: relative;
 }

 .message-role {
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brand);
  margin-bottom: 6px;
 }

 /* Both roles use the GOV.UK body scale (19/25). Assistant content also
    carries .markdown-content so headings/code inherit the doc-viewer
    styles. User content is plain text — preserve newlines the user
    typed. */
 .message-body {
  font-size: 19px;
  line-height: 25px;
  color: var(--text);
  word-break: break-word;
 }

 .user .message-body {
  white-space: pre-wrap;
  padding: 10px 15px;
  background: var(--accent-dim);
 }

 .assistant .message-body {
  background: none;
  padding: 0;
 }

 /* Compact margins for transcript paragraphs — same scale as the doc
    viewer, but tighter inter-paragraph spacing so the transcript stays
    scannable. */
 .message-body :global(p:first-child) {
  margin-top: 0;
 }
 .message-body :global(p:last-child) {
  margin-bottom: 0;
 }
 .message-body :global(p) {
  margin: 10px 0;
 }
 .message-body :global(h1),
 .message-body :global(h2),
 .message-body :global(h3) {
  margin: 15px 0 5px;
 }
 .message-body :global(ul),
 .message-body :global(ol) {
  margin: 5px 0;
  padding-left: 20px;
 }
 .message-body :global(li) {
  margin: 5px 0;
 }
 .message-body :global(pre) {
  margin: 10px 0;
  overflow-x: auto;
 }
 .message-body :global(blockquote) {
  margin: 10px 0;
  padding-left: 15px;
  border-left: 5px solid var(--border);
 }

 .typing-progress {
  padding: 12px 16px;
 }

 .tool-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 20px;
 }

 .tool-step {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #888);
 }

 .tool-step.done {
  color: var(--text-muted);
 }

 .tool-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
 }

 .tool-step:not(.done) .tool-icon {
  animation: spin 1s linear infinite;
 }

 @keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
 }

 .tool-name {
  font-weight: 600;
 }

 .tool-summary {
  color: var(--text-muted);
 }

 .thinking-dots {
  display: flex;
  gap: 5px;
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
  min-height: 44px;
  padding: 10px 15px;
  background: var(--bg-body);
  border: 2px solid var(--border-strong);
  border-radius: 0;
  color: var(--text);
  /* Explicit 16px keeps iOS Safari from auto-zooming on focus. */
  font-size: 16px;
  line-height: 20px;
  font-family: inherit;
  outline: none;
  resize: none;
  overflow-y: hidden;
 }

 /* Refines canonical :focus-visible (app.css) — adds inset border so the
    outline doesn't visually collide with the textarea's border. */
 .chat-input textarea:focus {
  outline: 3px solid var(--focus);
  outline-offset: 0;
  box-shadow: inset 0 0 0 2px var(--border-strong);
 }

 .chat-input textarea::placeholder {
  color: var(--text-muted);
 }

 .send-btn {
  min-height: 44px;
  min-width: 44px;
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

 /* Theme-aware hover: 90 % brightness of var(--success). Works on
    both light and dark without hard-coding either palette. */
 .send-btn:not(:disabled):hover {
  filter: brightness(0.9);
 }

 .send-btn:not(:disabled):active {
  top: 3px;
  box-shadow: none;
  position: relative;
 }

 /* Refines canonical :focus-visible (app.css) — GOV.UK yellow-fill on a
    coloured button, maintaining the pressed-shadow with focus-text colour. */
 .send-btn:focus:not(:active) {
  border-color: var(--focus);
  color: var(--focus-text);
  background: var(--focus);
  box-shadow: 0 3px 0 var(--focus-text);
 }

 .edit-btn {
  min-height: 44px;
  min-width: 44px;
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 10px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  margin-top: 2px;
 }

 .message.user:focus-within .edit-btn {
  opacity: 1;
 }

 .edit-btn:hover {
  color: var(--text);
 }

 .message.user:hover .edit-btn {
  opacity: 1;
 }

 .message.editing .message-body {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
 }

 .edit-btn {
  position: absolute;
  top: 0;
  right: 0;
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
  line-height: 20px;
  color: var(--text-secondary);
 }

 .edit-label {
  font-weight: 700;
 }

 .edit-cancel-btn {
  min-height: 44px;
  padding: 0 10px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  text-decoration: underline;
 }

 .edit-cancel-btn:hover {
  color: var(--text);
 }

 @media (max-width: 768px) {
  /* Respect the iPhone notch / home-indicator safe area. */
  .chat-input {
   padding-bottom: calc(15px + env(safe-area-inset-bottom, 0));
  }
 }

 /* Match the global .markdown-content @640 rule: body text
    drops from 19/25 to 16/20 on phone-sized widths. */
 @media (max-width: 640px) {
  .message-body {
   font-size: 16px;
   line-height: 20px;
  }
 }
</style>
