const INVISIBLE_FORMATTING =
	/[\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;

export function stripInvisibleUnicode(value: string): string {
	return value.replace(INVISIBLE_FORMATTING, '');
}

export function collapseWhitespace(value: string): string {
	return stripInvisibleUnicode(value).replace(/\s+/g, ' ').trim();
}

export function truncateText(value: string, maxLength: number): string {
	const clean = collapseWhitespace(value);
	if (clean.length <= maxLength) return clean;
	return `${clean.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function lineNumberAt(value: string, index: number): number {
	let line = 1;
	const end = Math.min(Math.max(index, 0), value.length);
	for (let position = 0; position < end; position += 1) {
		if (value.charCodeAt(position) === 10) line += 1;
	}
	return line;
}
