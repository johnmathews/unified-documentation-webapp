// Deterministic color class for source tags
// Colors defined as CSS classes in app.css with theme-aware light/dark variants
const TAG_CLASSES = ['tag-blue', 'tag-green', 'tag-purple', 'tag-orange', 'tag-teal', 'tag-red'];

export function sourceColorClass(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return TAG_CLASSES[Math.abs(hash) % TAG_CLASSES.length];
}
