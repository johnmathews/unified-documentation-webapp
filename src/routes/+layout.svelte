<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import { currentDocId } from '$lib/stores.svelte';
	import { MediaQuery } from 'svelte/reactivity';

	let { children } = $props();

	let sidebarOpen = $state(true);
	let chatOpen = $state(false);
	let chatExpanded = $state(false);
	let darkMode = $state(true);

	const isMobile = new MediaQuery('max-width: 600px');

	let touchStartX = 0;
	let touchStartY = 0;
	let touchStartTime = 0;
	const SWIPE_THRESHOLD = 50;
	const EDGE_ZONE = 30;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
		touchStartTime = Date.now();
	}

	function handleTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		const dt = Date.now() - touchStartTime;

		// Only count as swipe if horizontal movement dominates and is fast enough
		if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) || dt > 500) return;

		if (dx > 0) {
			// Swipe right
			if (chatOpen) { chatOpen = false; chatExpanded = false; }
			else if (touchStartX < EDGE_ZONE && !sidebarOpen) { sidebarOpen = true; }
		} else {
			// Swipe left
			if (sidebarOpen && isMobile.current) { sidebarOpen = false; }
			else if (touchStartX > window.innerWidth - EDGE_ZONE && !chatOpen) { chatOpen = true; }
		}
	}

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

	{#if (sidebarOpen || chatOpen) && isMobile.current}
		<button
			class="backdrop"
			onclick={() => { sidebarOpen = false; chatOpen = false; chatExpanded = false; }}
			aria-label="Close panel"
		></button>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="main-area" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
		<aside class="sidebar" class:open={sidebarOpen} aria-hidden={!sidebarOpen}>
			<Sidebar onNavigate={() => { if (window.innerWidth <= 600) sidebarOpen = false; }} />
		</aside>

		<main class="content">
			{@render children()}
		</main>

		<aside class="chat-panel" class:expanded={chatExpanded} class:hidden={!chatOpen}>
			<ChatPanel docId={currentDocId.value} expanded={chatExpanded} onToggleExpand={() => chatExpanded = !chatExpanded} />
		</aside>
	</div>

</div>

<svelte:window onkeydown={(e) => {
	if (e.key === 'Escape') {
		if (chatOpen) { chatOpen = false; chatExpanded = false; }
		else if (sidebarOpen && isMobile.current) { sidebarOpen = false; }
	}
}} />

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		padding-top: env(safe-area-inset-top, 0);
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
		display: flex;
		flex-direction: column;
		padding-bottom: env(safe-area-inset-bottom, 0);
	}

	.sidebar:not(.open) {
		display: none;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
		padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0));
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

	.backdrop {
		position: fixed;
		inset: 0;
		top: calc(48px + env(safe-area-inset-top, 0));
		background: rgba(0, 0, 0, 0.5);
		z-index: 99;
		border: none;
		padding: 0;
		cursor: default;
		animation: fadeIn 200ms ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@media (max-width: 1024px) {
		.sidebar {
			position: fixed;
			top: calc(48px + env(safe-area-inset-top, 0));
			left: 0;
			bottom: 0;
			z-index: 100;
			box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
			transform: translateX(-100%);
			transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.sidebar:not(.open) {
			display: flex;  /* Keep in DOM for slide animation */
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.chat-panel {
			position: fixed;
			top: calc(48px + env(safe-area-inset-top, 0));
			right: 0;
			bottom: 0;
			z-index: 100;
			box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
			transform: translateX(100%);
			transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.chat-panel.hidden {
			display: flex;  /* Keep in DOM for slide animation */
		}

		.chat-panel:not(.hidden) {
			transform: translateX(0);
		}

		.chat-panel.expanded {
			width: 100%;
		}
	}

	@media (max-width: 600px) {
		.sidebar {
			width: 100%;
			max-width: none;
		}
		.chat-panel {
			width: 100%;
		}
		.content { padding: 1rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0)); }
		.btn-label { display: none; }
		.icon-btn {
			min-height: 44px;
			min-width: 44px;
			padding: 0.6rem;
		}
		.app-title {
			padding: 0.5rem 0;
			min-height: 44px;
			display: inline-flex;
			align-items: center;
		}
	}

	/* Landscape phones: short viewport means sidebar/chat should be full-screen modals */
	@media (max-height: 500px) and (max-width: 1024px) {
		.sidebar {
			width: 100%;
			max-width: none;
		}
		.chat-panel {
			width: 100%;
		}
	}
</style>
