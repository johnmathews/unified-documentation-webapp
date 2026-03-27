/**
 * Format a source/project name for display.
 * Replaces hyphens and underscores with spaces, applies Title Case,
 * preserves short all-caps words (e.g., API, DNS).
 */
export function displaySource(name: string): string {
	let display = name
		.replace(/[_-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	display = display
		.split(' ')
		.map(word => {
			if (word.length === 0) return word;
			if (word === word.toUpperCase() && word.length <= 4) return word;
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ');

	return display || name;
}

/**
 * Format a document title for display.
 * Normalises filenames by removing extensions, replacing separators with spaces,
 * stripping date prefixes (YYMMDD-), and converting to Title Case.
 */
export function displayTitle(doc: { title: string | null; file_path: string }): string {
	// Use title if it looks like a real title (not just a filename)
	if (doc.title && !doc.title.includes('/') && !doc.title.endsWith('.md')) {
		return doc.title;
	}

	const filename = doc.file_path.split('/').pop() || doc.file_path;

	let name = filename
		// Remove file extension
		.replace(/\.[^.]+$/, '')
		// Strip leading date prefix like 260318- or 250321-
		.replace(/^\d{6}-/, '')
		// Replace underscores and hyphens with spaces
		.replace(/[_-]/g, ' ')
		// Collapse multiple spaces
		.replace(/\s+/g, ' ')
		.trim();

	// Title Case: capitalize first letter of each word
	name = name
		.split(' ')
		.map(word => {
			if (word.length === 0) return word;
			// If the word is all-caps and very short (like SDK, API, DNS), keep it
			if (word === word.toUpperCase() && word.length <= 3) return word;
			// Otherwise, capitalize first letter and lowercase the rest
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ');

	return name || filename;
}
