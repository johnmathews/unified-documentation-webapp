import { test, expect, type Page } from '@playwright/test';

// --- Viewport presets -----------------------------------------------------------
const IPHONE_PORTRAIT = { width: 390, height: 844 };
const IPHONE_LANDSCAPE = { width: 844, height: 390 };
const TABLET_PORTRAIT = { width: 768, height: 1024 };
const DESKTOP = { width: 1280, height: 800 };

// --- Helpers --------------------------------------------------------------------

const sidebar = (page: Page) => page.locator('aside.sidebar');
const filePickerBtn = (page: Page) => page.getByRole('button', { name: 'File Picker' });
const backdrop = (page: Page) => page.locator('button.backdrop');
const content = (page: Page) => page.locator('main.content');

/**
 * Whether the sidebar panel is visible (display is not 'none').
 */
async function isSidebarVisible(page: Page): Promise<boolean> {
	const display = await sidebar(page).evaluate(
		(el) => getComputedStyle(el).display
	);
	return display !== 'none';
}

// NOTE: sidebarOpen defaults to false — the sidebar starts CLOSED on all viewports.
// Users open it via the "File Picker" button in the service nav.

// =================================================================================
// Mobile portrait sidebar
// =================================================================================

test.describe('Mobile portrait sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar is hidden by default', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(false);
	});

	test('File Picker button opens the sidebar', async ({ page }) => {
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);
	});

	test('File Picker button toggles sidebar closed', async ({ page }) => {
		// Open
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(false);
	});

	test('backdrop appears when sidebar opens, disappears when closed', async ({ page }) => {
		// Closed — no backdrop
		expect(await backdrop(page).count()).toBe(0);

		// Open sidebar — backdrop appears
		await filePickerBtn(page).click();
		expect(await backdrop(page).count()).toBe(1);

		// Close via button — backdrop disappears
		await filePickerBtn(page).click();
		expect(await backdrop(page).count()).toBe(0);
	});

	test('sidebar takes full viewport width on mobile', async ({ page }) => {
		await filePickerBtn(page).click();

		const box = await sidebar(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThanOrEqual(IPHONE_PORTRAIT.width - 2);
	});

	test('content is accessible when sidebar is closed', async ({ page }) => {
		const box = await content(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThan(0);
	});
});

// =================================================================================
// Mobile landscape
// =================================================================================

test.describe('Mobile landscape sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar opens and closes correctly in landscape', async ({ page }) => {
		// Starts closed
		expect(await isSidebarVisible(page)).toBe(false);

		// Open
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(false);
	});

	test('sidebar has a fixed pixel width in landscape (not full-width)', async ({ page }) => {
		// At 844px wide, max-width:768px does not apply, so sidebar uses its pixel width
		await filePickerBtn(page).click();
		const box = await sidebar(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeLessThan(IPHONE_LANDSCAPE.width);
		expect(box!.width).toBeGreaterThan(200);
	});
});

// =================================================================================
// Tablet — sidebar is a fixed overlay
// =================================================================================

test.describe('Tablet sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(TABLET_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar opens and closes', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(false);

		// Open
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(false);
	});

	test('sidebar is full width at 768px breakpoint', async ({ page }) => {
		// At exactly 768px, max-width:768px media query matches → sidebar is 100% width
		await filePickerBtn(page).click();

		const width = await sidebar(page).evaluate(
			(el) => parseFloat(getComputedStyle(el).width)
		);
		expect(width).toBeGreaterThanOrEqual(TABLET_PORTRAIT.width - 2);
	});
});

// =================================================================================
// Desktop — sidebar is a fixed overlay
// =================================================================================

test.describe('Desktop sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar is hidden by default on desktop', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(false);
	});

	test('no backdrop when sidebar is closed', async ({ page }) => {
		expect(await backdrop(page).count()).toBe(0);
	});

	test('File Picker toggles sidebar on desktop', async ({ page }) => {
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(false);
	});
});

// =================================================================================
// CSS property checks
// =================================================================================

test.describe('CSS property checks', () => {
	test('mobile: closed sidebar has display none', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const display = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).display
		);
		expect(display).toBe('none');
	});

	test('mobile: open sidebar has display flex', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await filePickerBtn(page).click();

		const display = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).display
		);
		expect(display).toBe('flex');
	});

	test('mobile: open sidebar width is 100% of viewport', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await filePickerBtn(page).click();

		const width = await sidebar(page).evaluate(
			(el) => parseFloat(getComputedStyle(el).width)
		);
		expect(width).toBeGreaterThanOrEqual(IPHONE_PORTRAIT.width - 2);
	});

	test('tablet: open sidebar is full width at 768px breakpoint', async ({ page }) => {
		await page.setViewportSize(TABLET_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await filePickerBtn(page).click();

		const width = await sidebar(page).evaluate(
			(el) => parseFloat(getComputedStyle(el).width)
		);
		// At 768px, max-width:768px matches → full width
		expect(width).toBeGreaterThanOrEqual(TABLET_PORTRAIT.width - 2);
	});
});

// =================================================================================
// Viewport resize — transitioning between breakpoints shouldn't break state
// =================================================================================

test.describe('Viewport resize transitions', () => {
	test('open sidebar survives portrait-to-landscape rotation', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open sidebar
		await filePickerBtn(page).click();
		expect(await isSidebarVisible(page)).toBe(true);

		// Rotate to landscape — should still be visible
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.waitForTimeout(350);
		expect(await isSidebarVisible(page)).toBe(true);
	});

	test('closed sidebar stays closed through rotation', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Sidebar starts closed
		expect(await isSidebarVisible(page)).toBe(false);

		// Rotate to landscape — should stay closed
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.waitForTimeout(350);
		expect(await isSidebarVisible(page)).toBe(false);
	});
});
