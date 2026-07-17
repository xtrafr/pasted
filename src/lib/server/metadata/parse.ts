import { Parser } from 'htmlparser2';

const MAX_TITLE = 300;
const MAX_DESCRIPTION = 1_000;
const MAX_SITE_NAME = 200;

export interface ParsedLinkMetadata {
	title?: string;
	description?: string;
	siteName?: string;
	imageUrl?: string;
	faviconUrl?: string;
}

function removeUnsafeControlCharacters(value: string): string {
	return Array.from(value)
		.filter((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
		})
		.join('');
}

export function cleanMetadataText(value: string, maxLength: number): string | undefined {
	const cleaned = removeUnsafeControlCharacters(value).replace(/\s+/g, ' ').trim();
	return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function safeAssetUrl(value: string | undefined, baseUrl: URL): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value, baseUrl);
		if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
			return undefined;
		}
		return url.toString();
	} catch {
		return undefined;
	}
}

export function parseLinkMetadata(html: string, baseUrl: URL): ParsedLinkMetadata {
	const values = new Map<string, string>();
	let titleDepth = 0;
	let titleText = '';
	let faviconHref: string | undefined;

	const parser = new Parser(
		{
			onopentag(name, attributes) {
				const tag = name.toLowerCase();
				if (tag === 'title') titleDepth += 1;
				if (tag === 'meta') {
					const key = (attributes.property ?? attributes.name ?? '').toLowerCase().trim();
					const content = attributes.content;
					if (key && content && !values.has(key)) values.set(key, content);
				}
				if (tag === 'link') {
					const rel = (attributes.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
					if (!faviconHref && rel.some((entry) => entry === 'icon' || entry === 'shortcut')) {
						faviconHref = attributes.href;
					}
				}
			},
			ontext(text) {
				if (titleDepth > 0 && titleText.length < MAX_TITLE * 2) titleText += text;
			},
			onclosetag(name) {
				if (name.toLowerCase() === 'title' && titleDepth > 0) titleDepth -= 1;
			}
		},
		{ decodeEntities: true, lowerCaseTags: true }
	);

	parser.write(html);
	parser.end();

	const title = cleanMetadataText(
		values.get('og:title') ?? values.get('twitter:title') ?? titleText,
		MAX_TITLE
	);
	const description = cleanMetadataText(
		values.get('og:description') ??
			values.get('twitter:description') ??
			values.get('description') ??
			'',
		MAX_DESCRIPTION
	);
	const siteName = cleanMetadataText(values.get('og:site_name') ?? '', MAX_SITE_NAME);
	const imageUrl = safeAssetUrl(
		values.get('og:image:secure_url') ?? values.get('og:image') ?? values.get('twitter:image'),
		baseUrl
	);
	const faviconUrl = safeAssetUrl(faviconHref ?? '/favicon.ico', baseUrl);

	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(siteName ? { siteName } : {}),
		...(imageUrl ? { imageUrl } : {}),
		...(faviconUrl ? { faviconUrl } : {})
	};
}
