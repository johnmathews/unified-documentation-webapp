import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the pure utility logic that the API module and components share

describe('docUrl', () => {
	function docUrl(docId: string): string {
		return `/doc/${encodeURIComponent(docId)}`;
	}

	it('encodes simple doc IDs', () => {
		expect(docUrl('source:docs/readme.md')).toBe('/doc/source%3Adocs%2Freadme.md');
	});

	it('encodes doc IDs with special characters', () => {
		expect(docUrl('source:journal/250321-fix stuff.md')).toBe(
			'/doc/source%3Ajournal%2F250321-fix%20stuff.md'
		);
	});
});

describe('displayTitle', () => {
	function displayTitle(doc: { title: string | null; file_path: string }): string {
		return doc.title || doc.file_path.split('/').pop() || doc.file_path;
	}

	it('returns title when present', () => {
		expect(displayTitle({ title: 'My Doc', file_path: 'docs/my-doc.md' })).toBe('My Doc');
	});

	it('falls back to filename when title is null', () => {
		expect(displayTitle({ title: null, file_path: 'docs/my-doc.md' })).toBe('my-doc.md');
	});

	it('falls back to full path when no slash', () => {
		expect(displayTitle({ title: null, file_path: 'readme.md' })).toBe('readme.md');
	});
});

describe('formatDate', () => {
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	it('returns empty string for null', () => {
		expect(formatDate(null)).toBe('');
	});

	it('formats ISO date string', () => {
		const result = formatDate('2025-03-21T00:00:00Z');
		expect(result).toContain('2025');
		expect(result).toContain('Mar');
		expect(result).toContain('21');
	});
});

describe('journal entry sorting', () => {
	interface JournalEntry {
		doc_id: string;
		source: string;
		created_at: string | null;
		modified_at: string | null;
	}

	function sortJournalEntries(entries: JournalEntry[]): JournalEntry[] {
		return [...entries].sort((a, b) => {
			const da = a.created_at || a.modified_at || '';
			const db = b.created_at || b.modified_at || '';
			return db.localeCompare(da);
		});
	}

	it('sorts entries by date descending (most recent first)', () => {
		const entries: JournalEntry[] = [
			{ doc_id: 'a', source: 's1', created_at: '2025-01-01', modified_at: null },
			{ doc_id: 'b', source: 's2', created_at: '2025-03-15', modified_at: null },
			{ doc_id: 'c', source: 's1', created_at: '2025-02-10', modified_at: null }
		];
		const sorted = sortJournalEntries(entries);
		expect(sorted.map((e) => e.doc_id)).toEqual(['b', 'c', 'a']);
	});

	it('falls back to modified_at when created_at is null', () => {
		const entries: JournalEntry[] = [
			{ doc_id: 'a', source: 's1', created_at: null, modified_at: '2025-03-01' },
			{ doc_id: 'b', source: 's2', created_at: '2025-03-15', modified_at: null }
		];
		const sorted = sortJournalEntries(entries);
		expect(sorted.map((e) => e.doc_id)).toEqual(['b', 'a']);
	});

	it('handles entries with no dates', () => {
		const entries: JournalEntry[] = [
			{ doc_id: 'a', source: 's1', created_at: null, modified_at: null },
			{ doc_id: 'b', source: 's2', created_at: '2025-01-01', modified_at: null }
		];
		const sorted = sortJournalEntries(entries);
		expect(sorted.map((e) => e.doc_id)).toEqual(['b', 'a']);
	});
});

describe('journal entry grouping by month', () => {
	function monthKey(dateStr: string | null): string {
		if (!dateStr) return 'Unknown date';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric',
				month: 'long'
			});
		} catch {
			return 'Unknown date';
		}
	}

	it('groups dates into month/year format', () => {
		const result = monthKey('2025-03-15');
		expect(result).toContain('March');
		expect(result).toContain('2025');
	});

	it('returns "Unknown date" for null', () => {
		expect(monthKey(null)).toBe('Unknown date');
	});

	it('groups same-month dates identically', () => {
		expect(monthKey('2025-03-01')).toBe(monthKey('2025-03-28'));
	});

	it('separates different months', () => {
		expect(monthKey('2025-03-01')).not.toBe(monthKey('2025-04-01'));
	});
});

describe('fetchTree', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('calls /api/tree and returns parsed JSON', async () => {
		const mockData = [{ source: 'test', docs: [], journal: [] }];
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockData)
			})
		);

		const { fetchTree } = await import('$lib/api');
		const result = await fetchTree();
		expect(result).toEqual(mockData);
		expect(fetch).toHaveBeenCalledWith('/api/tree', undefined);
	});

	it('throws on non-ok response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: () => Promise.resolve({ error: 'Backend unavailable' })
			})
		);

		const { fetchTree } = await import('$lib/api');
		await expect(fetchTree()).rejects.toThrow('Backend unavailable');
	});
});
