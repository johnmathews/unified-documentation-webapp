<script lang="ts">
 import "../app.css";
 import favicon from "$lib/assets/favicon.svg";
 import Sidebar from "$lib/components/Sidebar.svelte";
 import ChatPanel from "$lib/components/ChatPanel.svelte";
 import SearchPanel from "$lib/components/SearchPanel.svelte";
 import { currentDocId } from "$lib/stores.svelte";
 import { page } from "$app/state";
 import { MediaQuery } from "svelte/reactivity";
 import { onMount } from "svelte";

 let { children } = $props();

 let sidebarOpen = $state(false);
 let chatOpen = $state(false);
 let chatExpanded = $state(false);
 let searchOpen = $state(false);
 // eslint-disable-next-line svelte/prefer-writable-derived
 let darkMode = $state(false);

 const isMobile = new MediaQuery("max-width: 768px");
 const isLargeScreen = new MediaQuery("min-width: 1200px");

 const DEFAULT_WIDTH = 320;
 const LARGE_DEFAULT_WIDTH = 384;
 let sidebarWidth = $state(DEFAULT_WIDTH);
 let isResizing = $state(false);

 const SEARCH_DEFAULT_WIDTH = 320;
 const SEARCH_LARGE_DEFAULT_WIDTH = 384;
 let searchWidth = $state(SEARCH_DEFAULT_WIDTH);
 let isSearchResizing = $state(false);

 const CHAT_DEFAULT_WIDTH = 432;
 let chatWidth = $state(CHAT_DEFAULT_WIDTH);
 let isChatResizing = $state(false);

 function handleResizeStart(e: MouseEvent) {
  e.preventDefault();
  isResizing = true;
  const startX = e.clientX;
  const startWidth = sidebarWidth;

  function onMove(ev: MouseEvent) {
   sidebarWidth = Math.max(250, Math.min(800, startWidth + (ev.clientX - startX)));
  }

  function onUp() {
   isResizing = false;
   document.removeEventListener("mousemove", onMove);
   document.removeEventListener("mouseup", onUp);
   localStorage.setItem("sidebar-width", String(sidebarWidth));
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
 }

 function handleSearchResizeStart(e: MouseEvent) {
  e.preventDefault();
  isSearchResizing = true;
  const startX = e.clientX;
  const startWidth = searchWidth;

  function onMove(ev: MouseEvent) {
   searchWidth = Math.max(250, Math.min(800, startWidth + (ev.clientX - startX)));
  }

  function onUp() {
   isSearchResizing = false;
   document.removeEventListener("mousemove", onMove);
   document.removeEventListener("mouseup", onUp);
   localStorage.setItem("search-width", String(searchWidth));
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
 }

 function handleChatResizeStart(e: MouseEvent) {
  e.preventDefault();
  isChatResizing = true;
  const startX = e.clientX;
  const startWidth = chatWidth;

  function onMove(ev: MouseEvent) {
   chatWidth = Math.max(300, Math.min(900, startWidth - (ev.clientX - startX)));
  }

  function onUp() {
   isChatResizing = false;
   document.removeEventListener("mousemove", onMove);
   document.removeEventListener("mouseup", onUp);
   localStorage.setItem("chat-width", String(chatWidth));
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
 }

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

  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) || dt > 500) return;

  if (dx > 0) {
   if (chatOpen) {
    chatOpen = false;
    chatExpanded = false;
   } else if (touchStartX < EDGE_ZONE && !sidebarOpen) {
    sidebarOpen = true;
   }
  } else {
   if (sidebarOpen && isMobile.current) {
    sidebarOpen = false;
   } else if (touchStartX > window.innerWidth - EDGE_ZONE && !chatOpen) {
    chatOpen = true;
   }
  }
 }

 onMount(() => {
  if (isMobile.current) sidebarOpen = false;
  const header = document.querySelector(".govuk-header");
  const nav = document.querySelector(".govuk-service-nav");
  if (header && nav) {
   const h = header.getBoundingClientRect().height + nav.getBoundingClientRect().height;
   document.documentElement.style.setProperty("--header-height", `${h}px`);
  }
  const saved = localStorage.getItem("sidebar-width");
  if (saved) {
   sidebarWidth = Math.max(250, Math.min(800, parseInt(saved, 10) || DEFAULT_WIDTH));
  } else if (isLargeScreen.current) {
   sidebarWidth = LARGE_DEFAULT_WIDTH;
  }
  const savedSearch = localStorage.getItem("search-width");
  if (savedSearch) {
   searchWidth = Math.max(250, Math.min(800, parseInt(savedSearch, 10) || SEARCH_DEFAULT_WIDTH));
  } else if (isLargeScreen.current) {
   searchWidth = SEARCH_LARGE_DEFAULT_WIDTH;
  }
  const savedChat = localStorage.getItem("chat-width");
  if (savedChat) {
   chatWidth = Math.max(300, Math.min(900, parseInt(savedChat, 10) || CHAT_DEFAULT_WIDTH));
  }
 });

 $effect(() => {
  darkMode = document.documentElement.dataset.theme === "dark";
 });

 function toggleTheme() {
  darkMode = !darkMode;
  if (darkMode) {
   document.documentElement.dataset.theme = "dark";
   localStorage.setItem("theme", "dark");
  } else {
   delete document.documentElement.dataset.theme;
   localStorage.setItem("theme", "light");
  }
 }

 let currentPath = $derived(page.url.pathname);
</script>

<svelte:head>
 <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-layout">
 <!-- Band 1: Header with logo/product name -->
 <header class="govuk-header">
  <div class="govuk-header__container">
   <div class="govuk-header__logo">
    <a href="/" class="govuk-header__link govuk-header__link--homepage">
     <span class="govuk-header__product-name"
      ><span class="govuk-header__product-name-prefix">Documentation</span> Library</span
     >
    </a>
   </div>
   <div class="govuk-header__actions">
    <div class="govuk-header__actions-utils">
     <button class="govuk-header__action-btn" onclick={toggleTheme} title={darkMode ? "Light mode" : "Dark mode"}>
      {#if darkMode}
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line
         x1="12"
         y1="21"
         x2="12"
         y2="23"
        /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line
         x1="1"
         y1="12"
         x2="3"
         y2="12"
        /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line
         x1="18.36"
         y1="5.64"
         x2="19.78"
         y2="4.22"
        />
       </svg>
      {:else}
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
       </svg>
      {/if}
     </button>
     <a href="/status" class="govuk-header__action-btn" title="Server status">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
     </a>
     <button class="govuk-header__action-btn" onclick={() => window.print()} title="Print page">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <polyline points="6 9 6 2 18 2 18 9" />
       <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
       <rect x="6" y="14" width="12" height="8" />
      </svg>
     </button>
    </div>
    <div class="govuk-header__actions-panels">
     <button
      class="govuk-header__action-btn"
      class:active={sidebarOpen}
      onclick={() => {
       sidebarOpen = !sidebarOpen;
       if (sidebarOpen) searchOpen = false;
      }}
      title="File picker"
     >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span class="govuk-header__btn-label">Files</span>
     </button>
     <button
      class="govuk-header__action-btn"
      class:active={searchOpen}
      onclick={() => {
       searchOpen = !searchOpen;
       if (searchOpen) sidebarOpen = false;
      }}
      title="Search documentation"
     >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
       <circle cx="11" cy="11" r="8" />
       <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span class="govuk-header__btn-label">Search</span>
     </button>
     <button
      class="govuk-header__action-btn"
      class:active={chatOpen}
      onclick={() => {
       chatOpen = !chatOpen;
       if (!chatOpen) chatExpanded = false;
      }}
      title="Toggle chat"
     >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span class="govuk-header__btn-label">Chat</span>
     </button>
    </div>
   </div>
  </div>
 </header>

 <!-- Band 2: Service navigation -->
 <nav class="govuk-service-nav" aria-label="Service navigation">
  <div class="govuk-service-nav__container">
   <ul class="govuk-service-nav__list">
    <li class="govuk-service-nav__item" class:govuk-service-nav__item--active={currentPath === "/"}>
     <a href="/" class="govuk-service-nav__link">
      {#if currentPath === "/"}<strong>Projects</strong>{:else}Projects{/if}
     </a>
    </li>
    <li class="govuk-service-nav__item" class:govuk-service-nav__item--active={currentPath === "/root-docs"}>
     <a href="/root-docs" class="govuk-service-nav__link">
      {#if currentPath === "/root-docs"}<strong>Root Docs</strong>{:else}Root Docs{/if}
     </a>
    </li>
    <li class="govuk-service-nav__item" class:govuk-service-nav__item--active={currentPath === "/journal"}>
     <a href="/journal" class="govuk-service-nav__link">
      {#if currentPath === "/journal"}<strong>Dev Journal</strong>{:else}Dev Journal{/if}
     </a>
    </li>
    <li class="govuk-service-nav__item" class:govuk-service-nav__item--active={currentPath === "/learning-journal"}>
     <a href="/learning-journal" class="govuk-service-nav__link">
      {#if currentPath === "/learning-journal"}<strong>Learning Journal</strong>{:else}Learning Journal{/if}
     </a>
    </li>
    <li class="govuk-service-nav__item" class:govuk-service-nav__item--active={currentPath === "/engineering-team"}>
     <a href="/engineering-team" class="govuk-service-nav__link">
      {#if currentPath === "/engineering-team"}<strong>Engineering Team</strong>{:else}Engineering Team{/if}
     </a>
    </li>
   </ul>
  </div>
 </nav>

 {#if sidebarOpen || chatOpen || searchOpen}
  <button
   class="backdrop"
   onclick={() => {
    sidebarOpen = false;
    chatOpen = false;
    chatExpanded = false;
    searchOpen = false;
   }}
   aria-label="Close panel"
  ></button>
 {/if}

 <!-- svelte-ignore a11y_no_static_element_interactions -->
 <div class="main-area" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
  <main class="content">
   {@render children()}
  </main>
 </div>
</div>

<!-- Panels outside the layout flow — fixed overlays at viewport level -->
<aside
 class="sidebar"
 class:open={sidebarOpen}
 class:resizing={isResizing}
 style="width: {isMobile.current ? '100%' : sidebarWidth + 'px'}"
 aria-hidden={!sidebarOpen}
>
 <Sidebar
  onNavigate={() => {
   if (window.innerWidth <= 768) sidebarOpen = false;
  }}
 />
 {#if !isMobile.current}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sidebar-resize-handle" onmousedown={handleResizeStart}></div>
 {/if}
</aside>

<aside
 class="search-panel"
 class:open={searchOpen}
 class:resizing={isSearchResizing}
 style="width: {isMobile.current ? '100%' : searchWidth + 'px'}"
 aria-hidden={!searchOpen}
>
 <SearchPanel
  onNavigate={() => {
   if (window.innerWidth <= 768) searchOpen = false;
  }}
 />
 {#if !isMobile.current}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="search-resize-handle" onmousedown={handleSearchResizeStart}></div>
 {/if}
</aside>

<aside
 class="chat-panel"
 class:expanded={chatExpanded}
 class:hidden={!chatOpen}
 class:resizing={isChatResizing}
 style="width: {isMobile.current ? '100%' : chatExpanded ? 'var(--chat-width-expanded)' : chatWidth + 'px'}"
>
 {#if !isMobile.current && !chatExpanded}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="chat-resize-handle" onmousedown={handleChatResizeStart}></div>
 {/if}
 <ChatPanel docId={currentDocId.value} expanded={chatExpanded} onToggleExpand={() => (chatExpanded = !chatExpanded)} />
</aside>

<svelte:window
 onkeydown={(e) => {
  if (e.key === "Escape") {
   if (chatOpen) {
    chatOpen = false;
    chatExpanded = false;
   } else if (searchOpen) {
    searchOpen = false;
   } else if (sidebarOpen && isMobile.current) {
    sidebarOpen = false;
   }
  }
 }}
/>

<style>
 .app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
 }

 /* ============================================================
    Band 1: Header — GOV.UK blue bar with product name
    ============================================================ */
 .govuk-header {
  background: var(--brand);
  color: #fff;
  border-bottom: 10px solid var(--brand-dark);
  flex-shrink: 0;
  z-index: 101;
  position: relative;
 }

 .govuk-header__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1100px;
  margin: 0 auto;
  padding: 10px 15px;
 }

 @media (min-width: 641px) {
  .govuk-header__container {
   padding: 10px 30px;
  }
 }

 .govuk-header__logo {
  display: flex;
  align-items: center;
 }

 .govuk-header__link--homepage {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  letter-spacing: -0.015em;
 }

 .govuk-header__link--homepage:visited,
 .govuk-header__link--homepage:hover {
  color: #fff;
  text-decoration: underline;
 }

 .govuk-header__link--homepage:focus {
  color: var(--focus-text);
  background: var(--focus);
  box-shadow: none;
  text-decoration: none;
 }

 .govuk-header__product-name {
  display: inline-block;
 }

 .govuk-header__product-name-prefix {
  display: inline;
 }

 .govuk-header__actions {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
 }

 .govuk-header__actions-utils {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
 }

 .govuk-header__actions-panels {
  display: flex;
  align-items: center;
  gap: 8px;
 }

 .govuk-header__action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  background: none;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
 }

 .govuk-header__action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
 }

 .govuk-header__action-btn.active {
  background: rgba(255, 255, 255, 0.2);
 }

 .govuk-header__action-btn:focus {
  color: var(--focus-text);
  background: var(--focus);
  outline: none;
 }

 .govuk-header__separator {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  margin: 0 4px;
 }

 .govuk-header__btn-label {
  font-size: 16px;
  font-weight: 400;
  color: inherit;
 }

 /* ============================================================
    Band 2: Service navigation — GOV.UK nav bar
    ============================================================ */
 .govuk-service-nav {
  background: var(--brand);
  color: #fff;
  flex-shrink: 0;
  z-index: 101;
  position: relative;
 }

 .govuk-service-nav__container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 15px;
  border-top: 1px solid var(--brand-surface-border);
 }

 @media (min-width: 641px) {
  .govuk-service-nav__container {
   padding: 0 30px;
  }
 }

 .govuk-service-nav__list {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
 }

 .govuk-service-nav__item {
  margin-right: 30px;
 }

 .govuk-service-nav__link {
  display: inline-block;
  padding: 15px 0 12px;
  color: #fff;
  font-size: 17px;
  line-height: 1.35;
  text-decoration: none;
  border-bottom: 5px solid transparent;
  font-family: inherit;
 }

 .govuk-service-nav__link:visited {
  color: #fff;
 }

 .govuk-service-nav__link:hover {
  color: #fff;
  text-decoration: underline;
 }

 .govuk-service-nav__link:focus {
  color: var(--focus-text);
  background: var(--focus);
  box-shadow: none;
  text-decoration: none;
 }

 .govuk-service-nav__item--active .govuk-service-nav__link {
  border-bottom-color: #fff;
  font-weight: 700;
 }

 /* Add bottom border on service nav to separate from content below */
 .govuk-service-nav {
  border-bottom: 1px solid var(--brand-dark);
 }

 /* ============================================================
    Main area: sidebar + content + chat
    ============================================================ */
 .main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
 }

 .sidebar {
  position: fixed;
  top: var(--header-height);
  left: 0;
  bottom: 0;
  z-index: 200;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  display: none;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
 }

 .sidebar.open {
  display: flex;
 }

 .sidebar.resizing {
  user-select: none;
 }

 .search-panel {
  position: fixed;
  top: var(--header-height);
  left: 0;
  bottom: 0;
  z-index: 200;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  display: none;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
 }

 .search-panel.open {
  display: flex;
 }

 .search-panel.resizing {
  user-select: none;
 }

 .search-resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 201;
 }

 .search-resize-handle:hover,
 .search-panel.resizing .search-resize-handle {
  background: var(--brand);
  opacity: 0.4;
 }

 .sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 201;
 }

 .sidebar-resize-handle:hover,
 .sidebar.resizing .sidebar-resize-handle {
  background: var(--brand);
  opacity: 0.4;
 }

 .content {
  flex: 1;
  overflow-y: auto;
  padding: 40px 30px;
  padding-bottom: calc(40px + env(safe-area-inset-bottom, 0));
  min-width: 0;
  background: var(--bg-body);
 }

 .chat-panel {
  position: fixed;
  top: var(--header-height);
  right: 0;
  bottom: 0;
  z-index: 200;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  overflow: hidden;
  display: none;
  flex-direction: column;
 }

 .chat-panel:not(.hidden) {
  display: flex;
 }

 .chat-panel.resizing {
  user-select: none;
 }

 .chat-resize-handle {
  position: absolute;
  top: 0;
  left: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 201;
 }

 .chat-resize-handle:hover,
 .chat-panel.resizing .chat-resize-handle {
  background: var(--brand);
  opacity: 0.4;
 }

 .backdrop {
  position: fixed;
  inset: 0;
  top: var(--header-height);
  background: var(--backdrop);
  z-index: 199;
  border: none;
  padding: 0;
  cursor: default;
  animation: fadeIn 200ms ease;
 }

 @keyframes fadeIn {
  from {
   opacity: 0;
  }
  to {
   opacity: 1;
  }
 }

 /* Below 769px: full-width overlays + mobile sizing */
 @media (max-width: 768px) {
  .sidebar {
   width: 100%;
   max-width: none;
  }

  .search-panel {
   width: 100%;
   max-width: none;
  }

  .chat-panel {
   width: 100%;
  }

  .chat-panel.expanded {
   width: 100%;
  }

  .content {
   padding: 20px 15px;
   padding-bottom: calc(20px + env(safe-area-inset-bottom, 0));
  }

  .govuk-header__actions-utils {
   gap: 2px;
  }

  .govuk-header__actions-panels {
   gap: 2px;
  }

  .govuk-header__btn-label {
   display: none;
  }

  .govuk-header__action-btn {
   min-height: 44px;
   min-width: 44px;
   padding: 10px 8px;
   justify-content: center;
  }

  .govuk-header__separator {
   height: 28px;
   margin: 0 2px;
  }

  .govuk-header__link--homepage {
   font-size: 20px;
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }

  .govuk-header__product-name-prefix {
   display: none;
  }

  .govuk-service-nav__link {
   font-size: 16px;
   padding: 10px 0 8px;
  }

  .govuk-service-nav__item {
   margin-right: 15px;
  }
 }

 @media (max-height: 500px) and (max-width: 1199px) {
  .sidebar {
   width: 100%;
   max-width: none;
  }
  .chat-panel {
   width: 100%;
  }
 }
</style>
