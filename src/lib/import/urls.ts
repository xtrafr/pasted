import { stripInvisibleUnicode } from './unicode';
import type { CandidateIssue, ExtractedUrl, ImportLimits } from './types';

const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file', 'blob', 'about']);
const TRACKING_PARAMETERS = new Set([
	'_ga',
	'dclid',
	'fbclid',
	'gclid',
	'mc_cid',
	'mc_eid',
	'msclkid',
	'oly_anon_id',
	'oly_enc_id',
	'twclid',
	'vero_conv',
	'vero_id',
	'wickedid',
	'yclid'
]);

const EXPLICIT_URL = /\bhttps?:\/\/[^\s<>"'`]+/giu;
const DANGEROUS_URL =
	/(^|[^a-z0-9_])((?:javascript|data|vbscript|file|blob|about):[^\s<>"'`]*)/gimu;
const BARE_URL =
	/(^|[^a-z0-9_@.-])((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})(?::\d{2,5})?(?:[/?#][^\s<>"'`]*)?)/gimu;

export interface NormalizedUrlResult {
	inputUrl: string;
	normalizedUrl?: string;
	domain?: string;
	issues: CandidateIssue[];
}

function countCharacter(value: string, character: string): number {
	let count = 0;
	for (const current of value) {
		if (current === character) count += 1;
	}
	return count;
}

export function trimUrlPunctuation(value: string): string {
	let result = stripInvisibleUnicode(value).trim();
	result = result.replace(/^[([{<"']+/, '');
	result = result.replace(/[.,;:!?"']+$/g, '');

	const pairs: Array<[string, string]> = [
		['(', ')'],
		['[', ']'],
		['{', '}']
	];
	for (const [opening, closing] of pairs) {
		while (
			result.endsWith(closing) &&
			countCharacter(result, closing) > countCharacter(result, opening)
		) {
			result = result.slice(0, -1);
		}
	}

	return result;
}

function rangesOverlap(start: number, end: number, matches: ExtractedUrl[]): boolean {
	return matches.some((match) => start < match.end && end > match.start);
}

function addExtractedUrl(
	matches: ExtractedUrl[],
	value: string,
	start: number,
	kind: ExtractedUrl['kind']
): void {
	const clean = trimUrlPunctuation(value);
	if (!clean) return;
	const end = start + clean.length;
	if (rangesOverlap(start, end, matches)) return;
	matches.push({ value: clean, start, end, kind });
}

export function extractUrls(value: string): ExtractedUrl[] {
	const input = stripInvisibleUnicode(value);
	const matches: ExtractedUrl[] = [];

	for (const match of input.matchAll(EXPLICIT_URL)) {
		addExtractedUrl(matches, match[0], match.index, 'http');
	}

	for (const match of input.matchAll(DANGEROUS_URL)) {
		const prefix = match[1] ?? '';
		const candidate = match[2] ?? '';
		addExtractedUrl(matches, candidate, match.index + prefix.length, 'dangerous');
	}

	for (const match of input.matchAll(BARE_URL)) {
		const prefix = match[1] ?? '';
		const candidate = match[2] ?? '';
		addExtractedUrl(matches, candidate, match.index + prefix.length, 'bare');
	}

	return matches.sort((left, right) => left.start - right.start);
}

function isTrackingParameter(name: string): boolean {
	const normalized = name.toLowerCase();
	return normalized.startsWith('utm_') || TRACKING_PARAMETERS.has(normalized);
}

function issue(code: CandidateIssue['code'], message: string): CandidateIssue {
	return { code, message };
}

export function normalizeUrl(
	value: string,
	limits: Pick<ImportLimits, 'maxUrlLength'>,
	removeTrackingParameters = true
): NormalizedUrlResult {
	const inputUrl = trimUrlPunctuation(value);
	if (inputUrl.length > limits.maxUrlLength) {
		return {
			inputUrl,
			issues: [issue('url-too-long', `URL exceeds the ${limits.maxUrlLength} character limit`)]
		};
	}

	const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(inputUrl);
	const scheme = schemeMatch?.[1]?.toLowerCase();
	if (scheme && DANGEROUS_SCHEMES.has(scheme)) {
		return {
			inputUrl,
			issues: [issue('dangerous-scheme', `${scheme}: URLs are not allowed`)]
		};
	}
	if (scheme && scheme !== 'http' && scheme !== 'https') {
		return {
			inputUrl,
			issues: [issue('unsupported-scheme', `${scheme}: URLs are not supported`)]
		};
	}

	let parseable = inputUrl;
	if (parseable.startsWith('//')) parseable = `https:${parseable}`;
	else if (!scheme) parseable = `https://${parseable}`;

	try {
		const url = new URL(parseable);
		if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) {
			return { inputUrl, issues: [issue('invalid-url', 'URL must use HTTP or HTTPS')] };
		}

		if (removeTrackingParameters) {
			for (const name of [...url.searchParams.keys()]) {
				if (isTrackingParameter(name)) url.searchParams.delete(name);
			}
			const fragmentName = url.hash.slice(1).split('=', 1)[0] ?? '';
			if (fragmentName && isTrackingParameter(fragmentName)) url.hash = '';
		}

		return {
			inputUrl,
			normalizedUrl: url.href,
			domain: url.hostname.toLowerCase(),
			issues: []
		};
	} catch {
		return { inputUrl, issues: [issue('invalid-url', 'URL could not be parsed')] };
	}
}
