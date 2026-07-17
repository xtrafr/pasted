import { assertCandidateCount } from '../limits';
import { appendUrlsFromText, cleanTitle } from '../parser-utils';
import { lineNumberAt, truncateText } from '../unicode';
import type { ImportParser, ParserContext, RawImportCandidate, RawParserResult } from '../types';

const INLINE_LINK =
	/\[([^\]\n]{0,500})\]\(\s*(<?(?:https?:\/\/|www\.|[a-z0-9.-]+\.[a-z]{2,})[^)\s>]*(?:\([^)]*\)[^)\s>]*)?>?)(?:\s+["'][^"']*["'])?\s*\)/gi;
const REFERENCE_LINK = /^\s*\[[^\]\n]+\]:\s*<?([^\s>]+)>?(?:\s+["'(].*)?$/gim;
const AUTOLINK = /<((?:https?:\/\/|www\.)[^>\s]+)>/gi;

function addMarkdownCandidate(
	candidates: RawImportCandidate[],
	rawUrl: string,
	content: string,
	index: number,
	context: ParserContext,
	title?: string
): void {
	const clean = cleanTitle(title);
	candidates.push({
		rawUrl: rawUrl.replace(/^<|>$/g, ''),
		...(clean ? { title: clean } : {}),
		sourceLabel: `Markdown line ${lineNumberAt(content, index)}`,
		sourceExcerpt: truncateText(content.slice(index, index + 500), context.limits.maxExcerptLength)
	});
	assertCandidateCount(candidates.length, context.limits);
}

export const markdownParser: ImportParser = {
	format: 'markdown',
	parse(input, context): RawParserResult {
		const candidates: RawParserResult['candidates'] = [];
		let masked = input.content;

		masked = masked.replace(INLINE_LINK, (full, title: string, url: string, offset: number) => {
			addMarkdownCandidate(candidates, url, input.content, offset, context, title);
			return ' '.repeat(full.length);
		});
		masked = masked.replace(REFERENCE_LINK, (full, url: string, offset: number) => {
			addMarkdownCandidate(candidates, url, input.content, offset, context);
			return ' '.repeat(full.length);
		});
		masked = masked.replace(AUTOLINK, (full, url: string, offset: number) => {
			addMarkdownCandidate(candidates, url, input.content, offset, context);
			return ' '.repeat(full.length);
		});

		for (const [lineIndex, line] of masked.split(/\r?\n/).entries()) {
			appendUrlsFromText(candidates, line, context, {
				sourceLabel: `Markdown line ${lineIndex + 1}`
			});
		}

		return { format: 'markdown', candidates, ignoredCount: 0, warnings: [] };
	}
};
