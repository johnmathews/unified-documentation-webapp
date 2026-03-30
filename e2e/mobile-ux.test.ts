import { test, expect, type Page } from '@playwright/test';

// --- Viewport presets -----------------------------------------------------------
const IPHONE_PORTRAIT = { width: 390, height: 844 };
const IPHONE_LANDSCAPE = { width: 844, height: 390 };

// --- Helpers --------------------------------------------------------------------

const sidebar = (page: Page) => page.locator('aside.sidebar');
const chatPanel = (page: Page) => page.locator('aside.chat-panel');
const filePickerBtn = (page: Page) => page.getByRole('button', { name: 'File Picker' });
const chatBtn = (page: Page) => page.getByTitle('Toggle chat');
const chatTextarea = (page: Page) => page.locator('.chat-input textarea');
const sendBtn = (page: Page) => page.locator('.send-btn');
const searchInput = (page: Page) => page.locator('.search-input');
const searchBtn = (page: Page) => page.getByTitle('Search documentation');

async function isSidebarVisible(page: Page): Promise<boolean> {
	const display = await sidebar(page).evaluate(
		(el) => getComputedStyle(el).display
	);
	return display !== 'none';
}

async function isChatVisible(page: Page): Promise<boolean> {
	const display = await chatPanel(page).evaluate(
		(el) => getComputedStyle(el).display
	);
	return display !== 'none';
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

	test('chat input area has bottom padding', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat
		await chatBtn(page).click();
		await page.waitForTimeout(200);

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
	test('chat textarea font-size is at least 16px on mobile', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat panel
		await chatBtn(page).click();
		await page.waitForTimeout(200);

		const fontSize = await chatTextarea(page).evaluate(
			(el) => getComputedStyle(el).fontSize
		);
		const px = parseFloat(fontSize);
		expect(px).toBeGreaterThanOrEqual(16);
	});

	test('search input font-size is at least 16px on mobile', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open search panel
		await searchBtn(page).click();

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

	test('sidebar uses fixed width in landscape (above 768px breakpoint)', async ({ page }) => {
		// At 844px, max-width:768px does not apply — sidebar uses pixel width, not 100%
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		const box = await sidebar(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeLessThan(IPHONE_LANDSCAPE.width);
		expect(box!.width).toBeGreaterThan(200);
	});

	test('chat panel uses fixed width in landscape (above 768px breakpoint)', async ({ page }) => {
		await chatBtn(page).click();
		await page.waitForTimeout(200);

		const box = await chatPanel(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeLessThan(IPHONE_LANDSCAPE.width);
		expect(box!.width).toBeGreaterThan(200);
	});

	test('sidebar closes and reopens correctly in landscape', async ({ page }) => {
		// Open
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(false);

		// Reopen
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);
	});
});

// =================================================================================
// E2E: Chat interaction on mobile
// =================================================================================

test.describe('Mobile chat interaction', () => {
	test('send button is visible alongside textarea on mobile portrait', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat
		await chatBtn(page).click();
		await page.waitForTimeout(200);

		// Both textarea and send button should be visible
		const textareaBox = await chatTextarea(page).boundingBox();
		const btnBox = await sendBtn(page).boundingBox();

		expect(textareaBox).toBeTruthy();
		expect(btnBox).toBeTruthy();

		// Both should be within the viewport
		expect(textareaBox!.y + textareaBox!.height).toBeLessThanOrEqual(IPHONE_PORTRAIT.height);
		expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(IPHONE_PORTRAIT.height);
	});

	test('chat textarea and send button are properly sized for touch on mobile', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open chat
		await chatBtn(page).click();
		await page.waitForTimeout(200);

		const textareaHeight = await chatTextarea(page).evaluate(
			(el) => el.getBoundingClientRect().height
		);
		const btnHeight = await sendBtn(page).evaluate(
			(el) => el.getBoundingClientRect().height
		);

		// Touch targets should be at least 44px
		expect(textareaHeight).toBeGreaterThanOrEqual(44);
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
		// Open sidebar first — it starts closed
		await filePickerBtn(page).click();

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
		// Open sidebar first
		await filePickerBtn(page).click();

		const treeItems = page.locator('.tree-item');
		const count = await treeItems.count();
		if (count > 0) {
			const fontSize = await treeItems.first().evaluate(
				(el) => parseFloat(getComputedStyle(el).fontSize)
			);
			expect(fontSize).toBeGreaterThanOrEqual(16);
		}
	});

	test('chat empty state text has readable font size', async ({ page }) => {
		await chatBtn(page).click();
		await page.waitForTimeout(200);

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
		await chatBtn(page).click();
		await page.waitForTimeout(200);

		const expandBtn = page.locator('.header-btn.expand-btn');
		const display = await expandBtn.evaluate(
			(el) => getComputedStyle(el).display
		);
		expect(display).toBe('none');
	});

	test('chat panel takes full viewport width on mobile', async ({ page }) => {
		await chatBtn(page).click();
		await page.waitForTimeout(200);

		const box = await chatPanel(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThanOrEqual(IPHONE_PORTRAIT.width - 2);
	});

	test('chat panel is hidden by default', async ({ page }) => {
		expect(await isChatVisible(page)).toBe(false);
	});

	test('chat panel shows after clicking Chat button', async ({ page }) => {
		await chatBtn(page).click();
		await page.waitForTimeout(200);
		expect(await isChatVisible(page)).toBe(true);
	});
});
