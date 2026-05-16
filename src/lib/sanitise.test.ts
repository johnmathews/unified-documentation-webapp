import { describe, it, expect } from "vitest";
import { sanitiseHtml } from "$lib/sanitise";

describe("sanitiseHtml", () => {
	describe("removes dangerous content", () => {
		it("strips <script> tags", () => {
			const dirty = "<p>hello</p><script>alert('xss')</script>";
			expect(sanitiseHtml(dirty)).not.toContain("<script>");
			expect(sanitiseHtml(dirty)).toContain("<p>hello</p>");
		});

		it("strips inline event handlers", () => {
			const dirty = `<img src="x" onerror="alert(1)" alt="oops">`;
			const clean = sanitiseHtml(dirty);
			expect(clean).not.toContain("onerror");
			expect(clean).not.toContain("alert");
		});

		it("strips javascript: URIs in href", () => {
			const dirty = `<a href="javascript:alert(1)">click</a>`;
			const clean = sanitiseHtml(dirty);
			expect(clean).not.toContain("javascript:");
		});

		it("strips data: URIs in href", () => {
			const dirty = `<a href="data:text/html,<script>alert(1)</script>">click</a>`;
			const clean = sanitiseHtml(dirty);
			expect(clean).not.toContain("data:");
		});

		it("strips vbscript: URIs in href", () => {
			const dirty = `<a href="vbscript:msgbox(1)">click</a>`;
			const clean = sanitiseHtml(dirty);
			expect(clean).not.toContain("vbscript:");
		});

		it("strips <iframe>", () => {
			const dirty = `<p>hi</p><iframe src="https://evil.example/"></iframe>`;
			expect(sanitiseHtml(dirty)).not.toContain("<iframe");
		});

		it("strips <style> blocks", () => {
			const dirty = `<style>body{display:none}</style><p>visible</p>`;
			const clean = sanitiseHtml(dirty);
			expect(clean).not.toContain("<style");
			expect(clean).toContain("<p>visible</p>");
		});

		it("strips event handlers from style attributes that try to execute", () => {
			const dirty = `<div style="background:url(javascript:alert(1))">x</div>`;
			const clean = sanitiseHtml(dirty);
			expect(clean).not.toContain("javascript:");
		});
	});

	describe("preserves legitimate markdown output", () => {
		it("keeps headings", () => {
			const html = "<h1>Title</h1><h2>Sub</h2><h3>Sub-sub</h3>";
			expect(sanitiseHtml(html)).toBe(html);
		});

		it("keeps paragraphs, emphasis, and links with safe href", () => {
			const html = `<p>Hello <em>world</em> <strong>!</strong> <a href="/doc/foo">link</a></p>`;
			expect(sanitiseHtml(html)).toContain(`href="/doc/foo"`);
			expect(sanitiseHtml(html)).toContain("<em>world</em>");
			expect(sanitiseHtml(html)).toContain("<strong>!</strong>");
		});

		it("keeps lists, blockquote, hr, br", () => {
			const html = `<ul><li>a</li><li>b</li></ul><blockquote>q</blockquote><hr><br>`;
			const clean = sanitiseHtml(html);
			expect(clean).toContain("<ul>");
			expect(clean).toContain("<blockquote>");
			expect(clean).toContain("<hr>");
			expect(clean).toContain("<br>");
		});

		it("keeps pre/code blocks", () => {
			const html = `<pre><code>console.log(1)</code></pre>`;
			expect(sanitiseHtml(html)).toBe(html);
		});

		it("keeps tables", () => {
			const html = `<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`;
			const clean = sanitiseHtml(html);
			expect(clean).toContain("<table>");
			expect(clean).toContain("<th>a</th>");
			expect(clean).toContain("<td>1</td>");
		});

		it("keeps <mark> for future highlight support", () => {
			const html = `<p>see <mark>this</mark></p>`;
			expect(sanitiseHtml(html)).toContain("<mark>this</mark>");
		});

		it("keeps <img> with src and alt (no event handlers)", () => {
			const html = `<img src="/api/files/foo:bar.png" alt="diagram">`;
			const clean = sanitiseHtml(html);
			expect(clean).toContain(`src="/api/files/foo:bar.png"`);
			expect(clean).toContain(`alt="diagram"`);
		});
	});

	describe("edge cases", () => {
		it("returns empty string for empty input", () => {
			expect(sanitiseHtml("")).toBe("");
		});

		it("returns plain text unchanged", () => {
			expect(sanitiseHtml("plain text")).toBe("plain text");
		});

		it("is idempotent", () => {
			const dirty = `<p>hi</p><script>x</script>`;
			const once = sanitiseHtml(dirty);
			const twice = sanitiseHtml(once);
			expect(once).toBe(twice);
		});
	});
});
