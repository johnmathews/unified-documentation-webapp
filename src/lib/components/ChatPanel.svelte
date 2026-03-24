<script lang="ts">
	import { sendChat, type ChatMessage } from '$lib/api';
	import { tick } from 'svelte';

	let {
		docId = null,
		expanded = false,
		onToggleExpand = () => {}
	}: {
		docId: string | null;
		expanded?: boolean;
		onToggleExpand?: () => void;
	} = $props();

	const STORAGE_KEY = 'doc-chat-messages';
	const PREV_STORAGE_KEY = 'doc-chat-messages-prev';

	let messages: ChatMessage[] = $state(loadMessages());
	let input = $state('');
	let sending = $state(false);
	let messagesEl: HTMLDivElement | undefined = $state();
	let confirmingClear = $state(false);
	let hasPrevious = $state(!!localStorage.getItem(PREV_STORAGE_KEY));

	function loadMessages(): ChatMessage[] {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	function saveMessages() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
		} catch { /* quota exceeded — ignore */ }
	}

	$effect(() => {
		// Read messages.length to track mutations (push/splice/reassignment)
		void messages.length;
		saveMessages();
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const msg = input.trim();
		if (!msg || sending) return;

		input = '';
		messages.push({ role: 'user', content: msg });
		sending = true;
		await scrollToBottom();

		try {
			const reply = await sendChat(msg, docId ?? undefined, messages.slice(0, -1));
			messages.push({ role: 'assistant', content: reply });
		} catch (err) {
			messages.push({
				role: 'assistant',
				content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`
			});
		} finally {
			sending = false;
			await scrollToBottom();
		}
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
		} catch { /* ignore */ }
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
		} catch { /* ignore */ }
	}

	function cancelClear() {
		confirmingClear = false;
	}

	function formatContent(content: string): string {
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/`(.*?)`/g, '<code>$1</code>')
			.replace(/\n/g, '<br>');
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
				<button class="header-btn" onclick={() => confirmingClear = true} title="Clear chat">
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
			<button class="header-btn" onclick={onToggleExpand} title={expanded ? 'Collapse' : 'Expand'}>
				{#if expanded}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
					</svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
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
				{#if docId}
					<p class="context-hint">The assistant can see the page you're viewing.</p>
				{/if}
			</div>
		{:else}
			{#each messages as msg}
				<div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
					<div class="message-bubble">
						{#if msg.role === 'assistant'}
							{@html formatContent(msg.content)}
						{:else}
							{msg.content}
						{/if}
					</div>
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

	<form class="chat-input" onsubmit={handleSubmit}>
		<input
			type="text"
			placeholder="Ask about the docs..."
			bind:value={input}
			disabled={sending}
		/>
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
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.chat-header h3 {
		font-size: 0.85rem;
		font-weight: 600;
		margin: 0;
	}

	.context-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		color: var(--success);
		background: rgba(74, 222, 128, 0.1);
		padding: 0.15rem 0.5rem;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.header-actions {
		margin-left: auto;
		display: flex;
		gap: 0.25rem;
	}

	.header-btn {
		padding: 0.3rem;
		background: none;
		border: none;
		color: var(--text-dim);
		border-radius: var(--radius);
	}

	.header-btn:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.confirm-clear {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.confirm-label {
		font-size: 0.7rem;
		color: var(--text-dim);
		margin-right: 0.15rem;
	}

	.confirm-yes:hover {
		color: var(--error, #ef4444);
	}

	.confirm-no:hover {
		color: var(--text);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 100%;
		color: var(--text-dim);
		text-align: center;
		padding: 2rem;
	}

	.empty-state p {
		font-size: 0.85rem;
	}

	.context-hint {
		font-size: 0.75rem;
		color: var(--text-dim);
	}

	.message {
		display: flex;
	}

	.message.user {
		justify-content: flex-end;
	}

	.message-bubble {
		max-width: 85%;
		padding: 0.6rem 0.85rem;
		border-radius: var(--radius-lg);
		font-size: 0.9rem;
		line-height: 1.55;
		word-break: break-word;
	}

	.user .message-bubble {
		background: var(--accent);
		color: white;
		border-bottom-right-radius: 2px;
	}

	.assistant .message-bubble {
		background: var(--bg);
		color: var(--text);
		border: 1px solid var(--border);
		border-bottom-left-radius: 2px;
	}

	.message-bubble :global(code) {
		font-family: var(--font-mono);
		font-size: 0.8em;
		background: rgba(0, 0, 0, 0.2);
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	.typing {
		display: flex;
		gap: 0.3rem;
		padding: 0.75rem 1rem;
	}

	.dot {
		width: 6px;
		height: 6px;
		background: var(--text-dim);
		border-radius: 50%;
		animation: bounce 1.2s infinite;
	}

	.dot:nth-child(2) { animation-delay: 0.2s; }
	.dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes bounce {
		0%, 80%, 100% { transform: translateY(0); }
		40% { transform: translateY(-4px); }
	}

	.chat-input {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem;
		border-top: 1px solid var(--border);
		flex-shrink: 0;
	}

	.chat-input input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font-size: 0.85rem;
		outline: none;
	}

	.chat-input input:focus {
		border-color: var(--accent);
	}

	.chat-input input::placeholder {
		color: var(--text-dim);
	}

	.send-btn {
		padding: 0.5rem;
		background: var(--accent);
		border: none;
		border-radius: var(--radius);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.15s;
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.send-btn:not(:disabled):hover {
		background: var(--accent-hover);
	}
</style>
