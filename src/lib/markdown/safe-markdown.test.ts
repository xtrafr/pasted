import { describe, expect, it } from 'vitest';
import { parseMarkdownInline, parseSafeMarkdown } from './safe-markdown';

describe('safe Markdown', () => {
	it('parses a small readable Markdown subset', () => {
		const blocks = parseSafeMarkdown(
			'# Plan\n\nReview **tests**, *docs*, and `release.ts`.\n\n- First\n- [Website](https://example.com/a)'
		);

		expect(blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'unordered-list']);
		const serialized = JSON.stringify(blocks);
		expect(serialized).toContain('"bold":true');
		expect(serialized).toContain('"italic":true');
		expect(serialized).toContain('"code":true');
		expect(serialized).toContain('https://example.com/a');
	});

	it('never turns HTML or dangerous protocols into executable output', () => {
		const source =
			'<img src=x onerror=alert(1)> [Run](javascript:alert(1)) <script>alert(2)</script>';
		const inlines = parseMarkdownInline(source);

		expect(inlines.some((inline) => inline.href !== null)).toBe(false);
		expect(inlines.map((inline) => inline.text).join('')).toContain('<img src=x onerror=alert(1)>');
		expect(inlines.map((inline) => inline.text).join('')).toContain('<script>alert(2)</script>');
	});

	it('allows only explicit web and email links', () => {
		const inlines = parseMarkdownInline(
			'[Web](https://example.com) [Mail](mailto:hello@example.com) [File](file:///secret)'
		);

		expect(inlines.flatMap((inline) => (inline.href ? [inline.href] : []))).toEqual([
			'https://example.com/',
			'mailto:hello@example.com'
		]);
	});
});
