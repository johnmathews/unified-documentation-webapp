export interface DocStats {
 words: number;
 lines: number;
}

export function countDocStats(content: string | null | undefined): DocStats {
 if (!content) return { words: 0, lines: 0 };

 const words = content.split(/\s+/).filter(Boolean).length;
 if (words === 0) return { words: 0, lines: 0 };

 const normalized = content.replace(/\r\n/g, "\n").replace(/\n$/, "");
 const lines = normalized.length === 0 ? 0 : normalized.split("\n").length;

 return { words, lines };
}
