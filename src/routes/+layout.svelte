<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import { currentDocId } from '$lib/stores.svelte';

	let { children } = $props();

	let sidebarOpen = $state(true);
	let chatOpen = $state(false);
	let chatExpanded = $state(false);
	let darkMode = $state(true);

	$effect(() => {
		darkMode = document.documentElement.dataset.theme !== 'light';
	});

	function toggleTheme() {
		darkMode = !darkMode;
		if (darkMode) {
			delete document.documentElement.dataset.theme;
			localStorage.removeItem('theme');
		} else {
			document.documentElement.dataset.theme = 'light';
			localStorage.setItem('theme', 'light');
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-layout">
	<header class="top-bar">
		<div class="top-bar-left">
			<button class="icon-btn" onclick={() => sidebarOpen = !sidebarOpen} title="Toggle sidebar">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			</button>
			<a href="/" class="app-title">Documentation</a>
		</div>
		<div class="top-bar-right">
			<button class="icon-btn" onclick={toggleTheme} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
				{#if darkMode}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{/if}
			</button>
			<button class="icon-btn" class:active={chatOpen} onclick={() => { chatOpen = !chatOpen; if (!chatOpen) chatExpanded = false; }} title="Toggle chat">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
				</svg>
				<span class="btn-label">Chat</span>
			</button>
		</div>
	</header>

	<div class="main-area">
		{#if sidebarOpen}
			<aside class="sidebar">
				<Sidebar onNavigate={() => { if (window.innerWidth <= 640) sidebarOpen = false; }} />
			</aside>
		{/if}

		<main class="content">
			{@render children()}
		</main>

		<aside class="chat-panel" class:expanded={chatExpanded} class:hidden={!chatOpen}>
			<ChatPanel docId={currentDocId.value} expanded={chatExpanded} onToggleExpand={() => chatExpanded = !chatExpanded} />
		</aside>
	</div>
</div>

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		height: 48px;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		z-index: 10;
	}

	.top-bar-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.top-bar-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.app-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem;
		background: none;
		border: none;
		color: var(--text-muted);
		border-radius: var(--radius);
		transition: all 0.15s;
	}

	.icon-btn:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.icon-btn.active {
		color: var(--accent);
		background: var(--accent-dim);
	}

	.btn-label {
		font-size: 0.8rem;
	}

	.main-area {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		width: var(--sidebar-width);
		flex-shrink: 0;
		background: var(--bg-surface);
		border-right: 1px solid var(--border);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
		min-width: 0;
	}

	.chat-panel {
		width: var(--chat-width);
		flex-shrink: 0;
		background: var(--bg-surface);
		border-left: 1px solid var(--border);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: width 0.2s ease;
	}

	.chat-panel.hidden {
		display: none;
	}

	.chat-panel.expanded {
		width: var(--chat-width-expanded);
	}

	@media (max-width: 1024px) {
		.sidebar {
			position: fixed;
			top: 48px;
			left: 0;
			bottom: 0;
			z-index: 20;
			box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
		}

		.chat-panel {
			position: fixed;
			top: 48px;
			right: 0;
			bottom: 0;
			z-index: 20;
			box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
		}

		.chat-panel.expanded {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		.sidebar { width: 100%; }
		.chat-panel { width: 100%; }
		.content { padding: 1rem; }
		.btn-label { display: none; }
	}
</style>
