/**
 * HTML sanitiser for the two {@html} render paths in this app:
 *   - ChatPanel assistant messages (marked-rendered)
 *   - /doc/[id] document body (marked + link-rewrite)
 *
 * Allowlist covers tags that `marked` emits for standard markdown:
 *   headings, paragraphs, emphasis, lists, blockquote, hr, br,
 *   anchors (with safe URIs), images (src + alt), tables, pre/code,
 *   plus <mark> for future highlight support.
 *
 * Denylist: <script>, <style>, <iframe>, all event-handler attributes,
 * javascript: / data: / vbscript: URIs.
 *
 * When you add a new markdown feature (e.g. footnote refs, definition
 * lists), revisit ALLOWED_TAGS and ALLOWED_ATTR.
 */
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
	"h1", "h2", "h3", "h4", "h5", "h6",
	"p", "br", "hr",
	"em", "strong", "del", "code", "pre",
	"blockquote",
	"ul", "ol", "li",
	"a",
	"img",
	"table", "thead", "tbody", "tfoot", "tr", "th", "td",
	"mark",
	"span", "div",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "id", "class"];

const CONFIG = {
	ALLOWED_TAGS,
	ALLOWED_ATTR,
	ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#|\?)/i,
};

export function sanitiseHtml(dirty: string): string {
	if (!dirty) return "";
	return DOMPurify.sanitize(dirty, CONFIG) as string;
}
