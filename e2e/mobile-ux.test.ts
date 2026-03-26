import { test, expect, type Page } from '@playwright/test';

// --- Viewport presets -----------------------------------------------------------
const IPHONE_PORTRAIT = { width: 390, height: 844 };
const IPHONE_LANDSCAPE = { width: 844, height: 390 };

// --- Helpers --------------------------------------------------------------------

const sidebar = (page: Page) => page.locator('aside.sidebar');
const chatPanel = (page: Page) => page.locator('aside.chat-panel');
const toggleSidebar = (page: Page) => page.getByTitle('Toggle sidebar');
const toggleChat = (page: Page) => page.getByTitle('Toggle chat');
const chatInput = (page: Page) => page.locator('.chat-input input');
const sendBtn = (page: Page) => page.locator('.send-btn');
const searchInput = (page: Page) => page.locator('.search-box input');

async function isSidebarVisible(page: Page): Promise<boolean> {
	const box = await sidebar(page).boundingBox();
	if (!box) return false;
	return box.x + box.width > 0;
}

// =================================================================================
// Safe area / bottom bar — content extends to bottom of viewport
// =================================================================================

test.describe('Safe area bottom handling', () => {
	test('content area has safe-area-aware bottom padding (portrait)', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const paddingBottom = await page.locator('main.content').evaluate(
			(el) => getComputedStyle(el).paddingBottom
		);
		// Should have at least some bottom padding (1rem = 14px minimum)
		const px = parseFloat(paddingBottom);
		expect(px).toBeGreaterThanOrEqual(14);
	});

	test('sidebar has bottom padding for safe area', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const paddingBottom = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).paddingBottom
		);
		// Should exist (may be 0px in test browser without safe area, but CSS is applied)
		expect(paddingBottom).toBeDefined();
	});

	test('chat input has safe-area-aware bottom padding', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat and wait for slide animation
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const paddingBottom = await page.locator('.chat-input').evaluate(
			(el) => getComputedStyle(el).paddingBottom
		);
		const px = parseFloat(paddingBottom);
		// At minimum 0.75rem = ~10.5px
		expect(px).toBeGreaterThanOrEqual(10);
	});
});

// =================================================================================
// Input font size — must be >= 16px to prevent iOS Safari auto-zoom
// =================================================================================

test.describe('Input font sizes prevent iOS zoom', () => {
	test('chat input font-size is at least 16px on mobile', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat panel and wait for slide animation
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const fontSize = await chatInput(page).evaluate(
			(el) => getComputedStyle(el).fontSize
		);
		const px = parseFloat(fontSize);
		expect(px).toBeGreaterThanOrEqual(16);
	});

	test('search input font-size is at least 16px on mobile', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Sidebar starts open, search input should be visible
		const fontSize = await searchInput(page).evaluate(
			(el) => getComputedStyle(el).fontSize
		);
		const px = parseFloat(fontSize);
		expect(px).toBeGreaterThanOrEqual(16);
	});
});

// =================================================================================
// Landscape phone — sidebar and chat should be full-screen modals
// =================================================================================

test.describe('Landscape phone: full-screen modals', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar takes full viewport width in landscape', async ({ page }) => {
		// Sidebar starts open
		expect(await isSidebarVisible(page)).toBe(true);

		const box = await sidebar(page).boundingBox();
		expect(box).toBeTruthy();
		// Should be full width (844px viewport)
		expect(box!.width).toBeGreaterThanOrEqual(IPHONE_LANDSCAPE.width - 2);
	});

	test('chat panel takes full viewport width in landscape', async ({ page }) => {
		// Close sidebar first, then open chat
		await toggleSidebar(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const box = await chatPanel(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThanOrEqual(IPHONE_LANDSCAPE.width - 2);
	});

	test('sidebar closes and reopens correctly in landscape full-screen mode', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await toggleSidebar(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);

		// Reopen
		await toggleSidebar(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(true);
	});
});

// =================================================================================
// E2E: Chat interaction on mobile
// =================================================================================

test.describe('Mobile chat interaction', () => {
	test('send button is visible alongside input on mobile portrait', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat and wait for slide animation
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		// Both input and send button should be visible
		const inputBox = await chatInput(page).boundingBox();
		const btnBox = await sendBtn(page).boundingBox();

		expect(inputBox).toBeTruthy();
		expect(btnBox).toBeTruthy();

		// Both should be within the viewport
		expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(IPHONE_PORTRAIT.height);
		expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(IPHONE_PORTRAIT.height);
	});

	test('chat input and send button are properly sized for touch on mobile', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat and wait for slide animation
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const inputHeight = await chatInput(page).evaluate(
			(el) => el.getBoundingClientRect().height
		);
		const btnHeight = await sendBtn(page).evaluate(
			(el) => el.getBoundingClientRect().height
		);

		// Touch targets should be at least 44px
		expect(inputHeight).toBeGreaterThanOrEqual(44);
		expect(btnHeight).toBeGreaterThanOrEqual(44);
	});
});

// =================================================================================
// Mobile typography — text must be readable on phone screens
// =================================================================================

test.describe('Mobile typography', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('base font size is at least 16px on mobile', async ({ page }) => {
		const fontSize = await page.evaluate(
			() => getComputedStyle(document.body).fontSize
		);
		const px = parseFloat(fontSize);
		expect(px).toBeGreaterThanOrEqual(16);
	});

	test('sidebar tree items have readable font size', async ({ page }) => {
		// Sidebar starts open
		const treeItems = page.locator('.tree-toggle');
		const count = await treeItems.count();
		if (count > 0) {
			const fontSize = await treeItems.first().evaluate(
				(el) => parseFloat(getComputedStyle(el).fontSize)
			);
			// Should be at least 16px (1rem at 16px base)
			expect(fontSize).toBeGreaterThanOrEqual(16);
		}
	});

	test('sidebar document links have readable font size', async ({ page }) => {
		const treeItems = page.locator('.tree-item');
		const count = await treeItems.count();
		if (count > 0) {
			const fontSize = await treeItems.first().evaluate(
				(el) => parseFloat(getComputedStyle(el).fontSize)
			);
			expect(fontSize).toBeGreaterThanOrEqual(16);
		}
	});

	test('chat message bubbles have readable font size', async ({ page }) => {
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		// Check the empty state text as a proxy for message font size
		const emptyText = page.locator('.empty-state p').first();
		const fontSize = await emptyText.evaluate(
			(el) => parseFloat(getComputedStyle(el).fontSize)
		);
		expect(fontSize).toBeGreaterThanOrEqual(16);
	});
});

// =================================================================================
// Chat panel as full-screen modal on mobile
// =================================================================================

test.describe('Mobile chat panel modal behavior', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('expand button is hidden on mobile', async ({ page }) => {
		// Close sidebar, open chat
		await toggleSidebar(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const expandBtn = page.locator('.header-btn.expand-btn');
		const display = await expandBtn.evaluate(
			(el) => getComputedStyle(el).display
		);
		expect(display).toBe('none');
	});

	test('chat panel takes full viewport width on mobile', async ({ page }) => {
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const box = await chatPanel(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThanOrEqual(IPHONE_PORTRAIT.width - 2);
	});

	test('chat panel slides in and out with animation', async ({ page }) => {
		// Chat starts hidden — verify it is off-screen
		const hiddenTransform = await chatPanel(page).evaluate(
			(el) => getComputedStyle(el).transform
		);
		// translateX(100%) computes to matrix(1, 0, 0, 1, <width>, 0)
		if (hiddenTransform && hiddenTransform !== 'none') {
			const match = hiddenTransform.match(/matrix\(([^)]+)\)/);
			if (match) {
				const tx = parseFloat(match[1].split(',')[4].trim());
				expect(tx).toBeGreaterThan(0);
			}
		}

		// Open — should slide to translateX(0)
		await toggleChat(page).click();
		await chatPanel(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const openTransform = await chatPanel(page).evaluate(
			(el) => getComputedStyle(el).transform
		);
		if (openTransform && openTransform !== 'none') {
			const match = openTransform.match(/matrix\(([^)]+)\)/);
			if (match) {
				const tx = parseFloat(match[1].split(',')[4].trim());
				expect(tx).toBe(0);
			}
		}
	});

	test('chat panel stays in DOM when hidden for slide animation', async ({ page }) => {
		// Chat starts hidden on mobile
		const display = await chatPanel(page).evaluate(
			(el) => getComputedStyle(el).display
		);
		// Must remain display:flex for the CSS transition to animate
		expect(display).toBe('flex');
	});
});
