/**
 * Content-Security-Policy header builder.
 *
 * First-pass policy (Round 4, batch 2). Deliberately permissive: SvelteKit's
 * client bootstrap uses inline scripts and Svelte component styles render as
 * inline `<style>` blocks, so 'unsafe-inline' stays for now. A nonce-based
 * tightening is a follow-up round (see .engineering-team/improvement-plan.md
 * non-goals).
 *
 * Returned as a single header value; one entry per directive, semicolon
 * separated. Keep this list flat so additions are obvious in diffs.
 */
const DIRECTIVES: Record<string, string[]> = {
 "default-src": ["'self'"],
 // SvelteKit hydration uses inline bootstrap scripts.
 "script-src": ["'self'", "'unsafe-inline'"],
 // Svelte scoped styles render as inline <style> blocks.
 "style-src": ["'self'", "'unsafe-inline'"],
 // Markdown can embed data: image URIs (e.g. inlined diagrams).
 "img-src": ["'self'", "data:"],
 "font-src": ["'self'"],
 // All backend calls are same-origin via SvelteKit server routes.
 "connect-src": ["'self'"],
 // PDFs are embedded via <iframe> from same-origin (/api/files/...).
 "frame-src": ["'self'"],
 "frame-ancestors": ["'none'"],
 "base-uri": ["'self'"],
 "form-action": ["'self'"],
 "object-src": ["'none'"],
};

export function buildCspHeader(): string {
 return Object.entries(DIRECTIVES)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");
}
