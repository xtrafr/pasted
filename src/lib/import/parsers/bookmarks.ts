import { assertCandidateCount } from '../limits';
import {
	candidateUrlsFromAttribute,
	cleanTitle,
	getHtmlAttribute,
	stripHtml
} from '../parser-utils';
import type { ImportParser, RawParserResult } from '../types';

const BOOKMARK_TOKEN =
	/<dt>\s*<h3\b[^>]*>([\s\S]*?)<\/h3\s*>|<dl\b[^>]*>|<\/dl\s*>|<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

function bookmarkDate(value: string | undefined): string | undefined {
	if (!value || !/^\d{1,16}$/.test(value)) return undefined;
	const numeric = Number(value);
	const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
	const date = new Date(milliseconds);
	return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

export const netscapeBookmarksParser: ImportParser = {
	format: 'netscape-bookmarks',
	parse(input, context): RawParserResult {
		const candidates: RawParserResult['candidates'] = [];
		const folders: string[] = [];
		let pendingFolder: string | undefined;
		let ignoredCount = 0;
		let bookmarkIndex = 0;

		for (const match of input.content.matchAll(BOOKMARK_TOKEN)) {
			const token = match[0].toLowerCase();
			if (match[1] !== undefined) {
				pendingFolder = cleanTitle(stripHtml(match[1]));
			} else if (token.startsWith('<dl')) {
				if (pendingFolder) {
					folders.push(pendingFolder);
					pendingFolder = undefined;
				}
			} else if (token.startsWith('</dl')) {
				if (folders.length > 0) folders.pop();
			} else if (match[2] !== undefined) {
				bookmarkIndex += 1;
				const href = getHtmlAttribute(match[2], 'href');
				const urls = href ? candidateUrlsFromAttribute(href) : [];
				if (urls.length === 0) {
					ignoredCount += 1;
					continue;
				}
				for (const rawUrl of urls) {
					const title = cleanTitle(stripHtml(match[3] ?? ''));
					const sourceDate = bookmarkDate(getHtmlAttribute(match[2], 'add_date'));
					candidates.push({
						rawUrl,
						...(title ? { title } : {}),
						...(sourceDate ? { sourceDate } : {}),
						sourceLabel: `Bookmark ${bookmarkIndex}`,
						sourceExcerpt: rawUrl,
						collectionPath: [...folders]
					});
					assertCandidateCount(candidates.length, context.limits);
				}
			}
		}

		return { format: 'netscape-bookmarks', candidates, ignoredCount, warnings: [] };
	}
};
