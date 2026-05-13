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

	it("renders intermediate folder segments as plain text", () => {
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
		expect(items[2].textContent?.trim()).toBe("docs");
		expect(items[2].querySelector("a")).toBeNull();
		expect(items[3].textContent?.trim()).toBe("runbooks");
		expect(items[3].querySelector("a")).toBeNull();
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
