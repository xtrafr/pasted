import { describe, expect, it } from 'vitest';
import { parseLinkMetadata } from './parse';

describe('link metadata parser', () => {
	it('extracts and truncates safe metadata without executing markup', () => {
		const parsed = parseLinkMetadata(
			`<!doctype html>
			<html><head>
			<title>Fallback title</title>
			<meta property="og:title" content="A saved page">
			<meta name="description" content="  Useful   details  ">
			<meta property="og:image" content="/cover.png">
			<link rel="icon" href="/icon.png">
			<script>throw new Error('must not run')</script>
			</head></html>`,
			new URL('https://example.org/path')
		);

		expect(parsed).toEqual({
			title: 'A saved page',
			description: 'Useful details',
			imageUrl: 'https://example.org/cover.png',
			faviconUrl: 'https://example.org/icon.png'
		});
	});

	it('drops dangerous asset schemes and URL credentials', () => {
		const parsed = parseLinkMetadata(
			'<meta property="og:image" content="javascript:alert(1)"><link rel="icon" href="https://user:pass@example.org/icon.png">',
			new URL('https://example.org')
		);
		expect(parsed.imageUrl).toBeUndefined();
		expect(parsed.faviconUrl).toBeUndefined();
	});
});
