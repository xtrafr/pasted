import { assertCandidateCount } from './limits';
import { extractUrls } from './urls';
import { collapseWhitespace, truncateText } from './unicode';
import type { ParserContext, RawImportCandidate } from './types';

export function appendUrlsFromText(
	candidates: RawImportCandidate[],
	value: string,
	context: ParserContext,
	metadata: Omit<RawImportCandidate, 'rawUrl' | 'sourceExcerpt'> & {
		sourceExcerpt?: string;
	} = {}
): number {
	const urls = extractUrls(value);
	for (const url of urls) {
		candidates.push({
			...metadata,
			rawUrl: url.value,
			sourceExcerpt: truncateText(metadata.sourceExcerpt ?? value, context.limits.maxExcerptLength)
		});
		assertCandidateCount(candidates.length, context.limits);
	}
	return urls.length;
}

export function decodeHtmlEntities(value: string): string {
	return value.replace(
		/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
		(entity, name: string) => {
			const normalized = name.toLowerCase();
			if (normalized === 'amp') return '&';
			if (normalized === 'apos') return "'";
			if (normalized === 'gt') return '>';
			if (normalized === 'lt') return '<';
			if (normalized === 'nbsp') return ' ';
			if (normalized === 'quot') return '"';
			const numeric = normalized.startsWith('#x')
				? Number.parseInt(normalized.slice(2), 16)
				: Number.parseInt(normalized.slice(1), 10);
			if (!Number.isFinite(numeric) || numeric < 0 || numeric > 0x10ffff) return entity;
			return String.fromCodePoint(numeric);
		}
	);
}

export function stripHtml(value: string): string {
	return collapseWhitespace(decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')));
}

export function getHtmlAttribute(attributes: string, name: string): string | undefined {
	const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(
		`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\\u0060]+))`,
		'i'
	);
	const match = pattern.exec(attributes);
	const value = match?.[1] ?? match?.[2] ?? match?.[3];
	return value === undefined ? undefined : decodeHtmlEntities(value);
}

export function candidateUrlsFromAttribute(value: string): string[] {
	const extracted = extractUrls(decodeHtmlEntities(value));
	if (extracted.length > 0) return extracted.map((url) => url.value);
	if (/^[a-z][a-z0-9+.-]*:/i.test(value.trim())) return [value.trim()];
	return [];
}

export function cleanTitle(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const title = collapseWhitespace(value);
	return title ? title.slice(0, 500) : undefined;
}
