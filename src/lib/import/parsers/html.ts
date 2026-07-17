import { assertCandidateCount } from '../limits';
import {
	appendUrlsFromText,
	candidateUrlsFromAttribute,
	cleanTitle,
	getHtmlAttribute,
	stripHtml
} from '../parser-utils';
import type { ImportParser, RawParserResult } from '../types';

const ACTIVE_HTML = /<(script|style|template|noscript)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi;
const ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

export const htmlParser: ImportParser = {
	format: 'html',
	parse(input, context): RawParserResult {
		const safeHtml = input.content.replace(ACTIVE_HTML, ' ');
		const candidates: RawParserResult['candidates'] = [];
		let ignoredCount = 0;
		let anchorIndex = 0;

		const withoutAnchors = safeHtml.replace(ANCHOR, (full, attributes: string, body: string) => {
			anchorIndex += 1;
			const href = getHtmlAttribute(attributes, 'href');
			if (!href) {
				ignoredCount += 1;
				return ' ';
			}
			const urls = candidateUrlsFromAttribute(href);
			if (urls.length === 0) ignoredCount += 1;
			for (const rawUrl of urls) {
				const title = cleanTitle(stripHtml(body));
				candidates.push({
					rawUrl,
					...(title ? { title } : {}),
					sourceLabel: `HTML anchor ${anchorIndex}`,
					sourceExcerpt: rawUrl
				});
				assertCandidateCount(candidates.length, context.limits);
			}
			return ' ';
		});

		const visibleText = stripHtml(withoutAnchors);
		appendUrlsFromText(candidates, visibleText, context, { sourceLabel: 'HTML text' });

		return { format: 'html', candidates, ignoredCount, warnings: [] };
	}
};
