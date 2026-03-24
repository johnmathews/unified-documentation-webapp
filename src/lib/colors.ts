// Deterministic color palette for source tags — subtle, muted tones
const SOURCE_COLORS = [
	{ bg: 'rgba(96, 165, 250, 0.15)', text: 'rgb(96, 165, 250)' },   // blue
	{ bg: 'rgba(52, 211, 153, 0.15)', text: 'rgb(52, 211, 153)' },   // emerald
	{ bg: 'rgba(251, 146, 60, 0.15)', text: 'rgb(251, 146, 60)' },   // orange
	{ bg: 'rgba(167, 139, 250, 0.15)', text: 'rgb(167, 139, 250)' }, // violet
	{ bg: 'rgba(248, 113, 113, 0.15)', text: 'rgb(248, 113, 113)' }, // red
	{ bg: 'rgba(45, 212, 191, 0.15)', text: 'rgb(45, 212, 191)' },   // teal
	{ bg: 'rgba(250, 204, 21, 0.15)', text: 'rgb(202, 175, 41)' },   // yellow
	{ bg: 'rgba(244, 114, 182, 0.15)', text: 'rgb(244, 114, 182)' }, // pink
];

export function sourceColor(name: string): { bg: string; text: string } {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return SOURCE_COLORS[Math.abs(hash) % SOURCE_COLORS.length];
}
