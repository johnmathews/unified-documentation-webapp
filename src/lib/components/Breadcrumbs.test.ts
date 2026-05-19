import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import Breadcrumbs from "./Breadcrumbs.svelte";

describe("Breadcrumbs", () => {
	it("renders Home + Source for a top-level source page (no filePath, no title)", () => {
		const { container } = render(Breadcrumbs, { props: { source: "pi-harness" } });
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		expect(items).toHaveLength(2);
		expect(items[0].textContent?.trim()).toBe("Home");
		// Last item is the current page — plain text, no link.
		expect(items[1].textContent?.trim()).toBe("Pi Harness");
		expect(items[1].querySelector("a")).toBeNull();
	});

	it("makes the source clickable when a title is provided", () => {
		const { container } = render(Breadcrumbs, {
			props: { source: "pi-harness", title: "Some doc" },
		});
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		expect(items).toHaveLength(3);
		const sourceLink = items[1].querySelector("a");
		expect(sourceLink).not.toBeNull();
		expect(sourceLink?.getAttribute("href")).toBe("/source/pi-harness");
		expect(items[2].textContent?.trim()).toBe("Some doc");
	});

	it("renders intermediate folder segments as clickable links with accumulated hrefs", () => {
		const { container } = render(Breadcrumbs, {
			props: {
				source: "pi-harness",
				filePath: "docs/runbooks/oncall.md",
				title: "Oncall guide",
			},
		});
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		// Home > Pi Harness > docs > runbooks > Oncall guide
		expect(items).toHaveLength(5);
		const docsLink = items[2].querySelector("a");
		expect(docsLink?.textContent?.trim()).toBe("docs");
		expect(docsLink?.getAttribute("href")).toBe("/source/pi-harness/docs");
		const runbooksLink = items[3].querySelector("a");
		expect(runbooksLink?.textContent?.trim()).toBe("runbooks");
		expect(runbooksLink?.getAttribute("href")).toBe(
			"/source/pi-harness/docs/runbooks",
		);
		// Current page stays non-link with aria-current.
		expect(items[4].querySelector("a")).toBeNull();
		expect(items[4].getAttribute("aria-current")).toBe("page");
	});

	it("encodes folder segments per-segment, preserving / separators", () => {
		const { container } = render(Breadcrumbs, {
			props: {
				source: "my source",
				filePath: "a b/c d/leaf.md",
				title: "Leaf",
			},
		});
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		const seg1 = items[2].querySelector("a");
		const seg2 = items[3].querySelector("a");
		expect(seg1?.getAttribute("href")).toBe("/source/my%20source/a%20b");
		expect(seg2?.getAttribute("href")).toBe("/source/my%20source/a%20b/c%20d");
	});

	it("renders Home > Journal in generic crumbs mode with Journal current", () => {
		const { container } = render(Breadcrumbs, {
			props: { crumbs: [{ label: "Journal" }] },
		});
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		expect(items).toHaveLength(2);
		expect(items[0].querySelector("a")?.getAttribute("href")).toBe("/");
		expect(items[1].textContent?.trim()).toBe("Journal");
		expect(items[1].querySelector("a")).toBeNull();
		expect(items[1].getAttribute("aria-current")).toBe("page");
	});

	it("links non-final crumbs in generic crumbs mode", () => {
		const { container } = render(Breadcrumbs, {
			props: {
				crumbs: [
					{ label: "Section", href: "/section" },
					{ label: "Here" },
				],
			},
		});
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		expect(items).toHaveLength(3);
		const sectionLink = items[1].querySelector("a");
		expect(sectionLink?.getAttribute("href")).toBe("/section");
		expect(items[2].querySelector("a")).toBeNull();
	});

	it("omits intermediate segments for root-level docs", () => {
		const { container } = render(Breadcrumbs, {
			props: {
				source: "pi-harness",
				filePath: "README.md",
				title: "Readme",
			},
		});
		const items = container.querySelectorAll(".govuk-breadcrumbs__list-item");
		// Home > Pi Harness > Readme (no intermediate)
		expect(items).toHaveLength(3);
	});

	it("links Home", () => {
		const { container } = render(Breadcrumbs, {
			props: { source: "pi-harness", title: "x" },
		});
		const homeLink = container.querySelector(".govuk-breadcrumbs__list-item a");
		expect(homeLink?.getAttribute("href")).toBe("/");
	});
});
