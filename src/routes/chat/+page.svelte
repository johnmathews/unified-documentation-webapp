<script lang="ts">
	import ChatPanel from "$lib/components/ChatPanel.svelte";
	import {
		listConversations,
		getConversation,
		deleteConversation,
		type ConversationSummary,
	} from "$lib/api";
	import { currentDocId, currentPageContext } from "$lib/stores.svelte";

	// Standalone page — not tied to a current doc. Pick up any context that
	// happens to be set (e.g. user navigated here from a doc), but null is fine.
	let docId = $derived(currentDocId.value);
	let pageContext = $derived(currentPageContext.value);

	let conversations: ConversationSummary[] = $state([]);
	let loadingHistory = $state(true);
	let activeId: string | null = $state(null);
	// Mobile-only: which column is showing. Desktop renders both side by side.
	let mobileView: "list" | "conversation" = $state("list");

	let chat: ChatPanel | undefined = $state();

	async function refreshHistory() {
		loadingHistory = true;
		try {
			conversations = await listConversations();
		} catch {
			conversations = [];
		} finally {
			loadingHistory = false;
		}
	}

	$effect(() => {
		refreshHistory();
	});

	async function openConversation(id: string) {
		try {
			const conv = await getConversation(id);
			chat?.loadConversation(conv.messages, conv.id);
			activeId = conv.id;
			mobileView = "conversation";
		} catch {
			/* ignore */
		}
	}

	async function removeConversation(e: Event, id: string) {
		e.stopPropagation();
		try {
			await deleteConversation(id);
			conversations = conversations.filter((c) => c.id !== id);
			if (activeId === id) {
				activeId = null;
				chat?.startNewConversation();
			}
		} catch {
			/* ignore */
		}
	}

	function newConversation() {
		chat?.startNewConversation();
		activeId = null;
		mobileView = "conversation";
	}

	function onConversationChange(id: string | null) {
		activeId = id;
		// A reply may have created a new conversation — keep the list current.
		refreshHistory();
	}

	function formatDate(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			const now = new Date();
			const diffMs = now.getTime() - d.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			if (diffMins < 1) return "just now";
			if (diffMins < 60) return `${diffMins}m ago`;
			const diffHrs = Math.floor(diffMins / 60);
			if (diffHrs < 24) return `${diffHrs}h ago`;
			const diffDays = Math.floor(diffHrs / 24);
			if (diffDays < 7) return `${diffDays}d ago`;
			return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
		} catch {
			return "";
		}
	}
</script>

<svelte:head>
	<title>Chat - Documentation Library</title>
</svelte:head>

<div class="chat-page" class:show-conversation={mobileView === "conversation"}>
	<aside class="history" aria-label="Conversation history">
		<div class="history-head">
			<h1>Conversations</h1>
			<button type="button" class="new-btn" onclick={newConversation} title="New conversation">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				New
			</button>
		</div>
		<div class="history-list">
			{#if loadingHistory}
				<p class="history-loading">Loading...</p>
			{:else if conversations.length === 0}
				<p class="history-empty">No previous conversations.</p>
			{:else}
				{#each conversations as conv (conv.id)}
					<div class="history-item-wrapper" class:active={activeId === conv.id}>
						<button type="button" class="history-row" onclick={() => openConversation(conv.id)}>
							<span class="history-title">{conv.title}</span>
							<div class="history-meta">
								<span>{conv.message_count} messages</span>
								<span>{formatDate(conv.updated_at)}</span>
							</div>
							{#if conv.preview}
								<p class="history-preview">{conv.preview}</p>
							{/if}
						</button>
						<button type="button" class="history-delete" onclick={(e) => removeConversation(e, conv.id)} aria-label="Delete conversation: {conv.title}">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				{/each}
			{/if}
		</div>
	</aside>

	<section class="conversation" aria-label="Conversation">
		<button type="button" class="back-btn" onclick={() => (mobileView = "list")}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polyline points="15 18 9 12 15 6" />
			</svg>
			Conversations
		</button>
		<ChatPanel bind:this={chat} {docId} {pageContext} {onConversationChange} />
	</section>
</div>

<style>
	/* Full-bleed two-column layout. Cancels the layout's .content padding so
	   the conversation area can use the full viewport height. */
	.chat-page {
		display: flex;
		margin: -40px -30px;
		height: calc(100vh - var(--header-height));
		height: calc(100dvh - var(--header-height));
		overflow: hidden;
	}

	.history {
		width: 320px;
		flex-shrink: 0;
		border-right: 1px solid var(--border);
		background: var(--bg-surface);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.history-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 15px 20px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.history-head h1 {
		font-size: 19px;
		line-height: 25px;
		font-weight: 700;
		margin: 0;
		color: var(--text);
	}

	.new-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		flex-shrink: 0;
		min-height: 40px;
		padding: 8px 16px;
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: 0;
		color: var(--text);
		font-family: inherit;
		font-size: 16px;
		line-height: 20px;
		white-space: nowrap;
		cursor: pointer;
	}

	.new-btn:hover {
		background: var(--bg-hover);
	}

	.history-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.history-loading,
	.history-empty {
		text-align: center;
		color: var(--text-muted);
		padding: 40px 20px;
		font-size: 16px;
		line-height: 20px;
	}

	.history-item-wrapper {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 0;
		border-bottom: 1px solid var(--border);
	}

	.history-item-wrapper.active {
		background: var(--accent-dim);
	}

	.history-row {
		flex: 1;
		min-width: 0;
		display: block;
		text-align: left;
		padding: 12px 15px;
		background: none;
		border: none;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		color: var(--text);
	}

	.history-row:hover {
		background: var(--bg-hover);
	}

	.history-title {
		display: block;
		font-size: 16px;
		line-height: 20px;
		font-weight: 600;
	}

	.history-delete {
		flex-shrink: 0;
		min-height: 44px;
		min-width: 44px;
		padding: 10px;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		opacity: 0;
	}

	.history-item-wrapper:hover .history-delete,
	.history-item-wrapper:focus-within .history-delete {
		opacity: 1;
	}

	.history-delete:hover {
		color: var(--error);
	}

	.history-meta {
		display: flex;
		gap: 10px;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-muted);
		margin-top: 3px;
	}

	.history-preview {
		font-size: 14px;
		line-height: 20px;
		color: var(--text-secondary);
		margin: 4px 0 0;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}

	.conversation {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* The "back to list" control is mobile-only. */
	.back-btn {
		display: none;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 10px 20px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border);
		color: var(--link);
		font-family: inherit;
		font-size: 16px;
		text-decoration: underline;
		cursor: pointer;
	}

	/* Touch targets must stay 44px on mobile (rest-of-app convention). */
	@media (max-width: 768px) {
		.chat-page {
			margin: -20px -15px;
			height: calc(100vh - var(--header-height));
			height: calc(100dvh - var(--header-height));
		}

		.history {
			width: 100%;
			border-right: none;
		}

		/* Stacked: show one column at a time. Default = list. */
		.conversation {
			display: none;
		}

		.chat-page.show-conversation .history {
			display: none;
		}

		.chat-page.show-conversation .conversation {
			display: flex;
		}

		.back-btn {
			display: flex;
		}

		.history-delete {
			opacity: 1;
		}
	}
</style>
