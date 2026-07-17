export type MarkdownInline = {
	text: string;
	bold: boolean;
	italic: boolean;
	code: boolean;
	href: string | null;
};

export type MarkdownBlock =
	| { type: 'heading'; level: 1 | 2 | 3; content: MarkdownInline[] }
	| { type: 'paragraph'; content: MarkdownInline[] }
	| { type: 'blockquote'; content: MarkdownInline[] }
	| { type: 'unordered-list' | 'ordered-list'; items: MarkdownInline[][] }
	| { type: 'code-block'; value: string };

type InlineStyle = Pick<MarkdownInline, 'bold' | 'italic' | 'code' | 'href'>;

const BASE_STYLE: InlineStyle = {
	bold: false,
	italic: false,
	code: false,
	href: null
};

function safeLink(value: string): string | null {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' ||
			parsed.protocol === 'https:' ||
			parsed.protocol === 'mailto:'
			? parsed.toString()
			: null;
	} catch {
		return null;
	}
}

function appendInline(output: MarkdownInline[], text: string, style: InlineStyle): void {
	if (!text) return;
	const previous = output.at(-1);
	if (
		previous &&
		previous.bold === style.bold &&
		previous.italic === style.italic &&
		previous.code === style.code &&
		previous.href === style.href
	) {
		previous.text += text;
		return;
	}
	output.push({ text, ...style });
}

function findClosingMarker(source: string, marker: string, from: number): number {
	let cursor = from;
	while (cursor < source.length) {
		const match = source.indexOf(marker, cursor);
		if (match < 0) return -1;
		if (match === 0 || source[match - 1] !== '\\') return match;
		cursor = match + marker.length;
	}
	return -1;
}

function parseInlineInto(
	source: string,
	output: MarkdownInline[],
	style: InlineStyle,
	depth: number
): void {
	if (depth > 8) {
		appendInline(output, source, style);
		return;
	}

	let cursor = 0;
	let plain = '';
	const flush = () => {
		appendInline(output, plain, style);
		plain = '';
	};

	while (cursor < source.length) {
		const current = source[cursor] ?? '';

		if (current === '\\' && cursor + 1 < source.length) {
			plain += source[cursor + 1];
			cursor += 2;
			continue;
		}

		if (current === '`') {
			const closing = findClosingMarker(source, '`', cursor + 1);
			if (closing > cursor + 1) {
				flush();
				appendInline(output, source.slice(cursor + 1, closing), { ...style, code: true });
				cursor = closing + 1;
				continue;
			}
		}

		if (current === '[') {
			const rest = source.slice(cursor);
			const link = /^\[([^\]\n]{1,500})\]\(([^\s)]+)(?:\s+["'][^"']*["'])?\)/.exec(rest);
			if (link) {
				flush();
				const href = safeLink(link[2] ?? '');
				const label = link[1] ?? '';
				if (href) appendInline(output, label, { ...style, href });
				else parseInlineInto(label, output, style, depth + 1);
				cursor += link[0].length;
				continue;
			}
		}

		const strongMarker = source.startsWith('**', cursor)
			? '**'
			: source.startsWith('__', cursor)
				? '__'
				: null;
		if (strongMarker) {
			const closing = findClosingMarker(source, strongMarker, cursor + strongMarker.length);
			if (closing > cursor + strongMarker.length) {
				flush();
				parseInlineInto(
					source.slice(cursor + strongMarker.length, closing),
					output,
					{ ...style, bold: true },
					depth + 1
				);
				cursor = closing + strongMarker.length;
				continue;
			}
		}

		if (current === '*' || current === '_') {
			const closing = findClosingMarker(source, current, cursor + 1);
			if (closing > cursor + 1) {
				flush();
				parseInlineInto(
					source.slice(cursor + 1, closing),
					output,
					{ ...style, italic: true },
					depth + 1
				);
				cursor = closing + 1;
				continue;
			}
		}

		plain += current;
		cursor += 1;
	}

	flush();
}

export function parseMarkdownInline(source: string): MarkdownInline[] {
	const output: MarkdownInline[] = [];
	parseInlineInto(source, output, BASE_STYLE, 0);
	return output;
}

export function parseSafeMarkdown(source: string): MarkdownBlock[] {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const blocks: MarkdownBlock[] = [];
	let cursor = 0;

	while (cursor < lines.length) {
		const line = lines[cursor] ?? '';
		if (!line.trim()) {
			cursor += 1;
			continue;
		}

		if (/^\s*```/.test(line)) {
			cursor += 1;
			const code: string[] = [];
			while (cursor < lines.length && !/^\s*```/.test(lines[cursor] ?? '')) {
				code.push(lines[cursor] ?? '');
				cursor += 1;
			}
			if (cursor < lines.length) cursor += 1;
			blocks.push({ type: 'code-block', value: code.join('\n') });
			continue;
		}

		const heading = /^\s{0,3}(#{1,3})\s+(.+?)\s*$/.exec(line);
		if (heading) {
			blocks.push({
				type: 'heading',
				level: heading[1]!.length as 1 | 2 | 3,
				content: parseMarkdownInline(heading[2] ?? '')
			});
			cursor += 1;
			continue;
		}

		if (/^\s{0,3}>\s?/.test(line)) {
			const quote: string[] = [];
			while (cursor < lines.length) {
				const match = /^\s{0,3}>\s?(.*)$/.exec(lines[cursor] ?? '');
				if (!match) break;
				quote.push(match[1] ?? '');
				cursor += 1;
			}
			blocks.push({ type: 'blockquote', content: parseMarkdownInline(quote.join('\n')) });
			continue;
		}

		const unordered = /^\s{0,3}[-+*]\s+(.+)$/.exec(line);
		const ordered = /^\s{0,3}\d+[.)]\s+(.+)$/.exec(line);
		if (unordered || ordered) {
			const type = unordered ? 'unordered-list' : 'ordered-list';
			const matcher = unordered ? /^\s{0,3}[-+*]\s+(.+)$/ : /^\s{0,3}\d+[.)]\s+(.+)$/;
			const items: MarkdownInline[][] = [];
			while (cursor < lines.length) {
				const match = matcher.exec(lines[cursor] ?? '');
				if (!match) break;
				items.push(parseMarkdownInline(match[1] ?? ''));
				cursor += 1;
			}
			blocks.push({ type, items });
			continue;
		}

		const paragraph: string[] = [];
		while (cursor < lines.length) {
			const candidate = lines[cursor] ?? '';
			if (!candidate.trim()) break;
			if (
				paragraph.length > 0 &&
				(/^\s*```/.test(candidate) ||
					/^\s{0,3}(?:#{1,3}\s+|>\s?|[-+*]\s+|\d+[.)]\s+)/.test(candidate))
			) {
				break;
			}
			paragraph.push(candidate);
			cursor += 1;
		}
		blocks.push({ type: 'paragraph', content: parseMarkdownInline(paragraph.join('\n')) });
	}

	return blocks;
}
