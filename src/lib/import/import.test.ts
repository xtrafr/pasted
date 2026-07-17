import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_IMPORT_LIMITS,
	IMPORT_PARSERS,
	ImportLimitError,
	detectImportFormat,
	detectSecrets,
	extractUrls,
	inspectCsvColumns,
	maskSecrets,
	normalizeUrl,
	parseImport,
	stripInvisibleUnicode
} from './index';

const fakeWhatsApp = readFileSync(
	new URL('../../../tests/fixtures/import/fake-whatsapp.txt', import.meta.url),
	'utf8'
);

describe('URL extraction and normalization', () => {
	it('extracts several URL forms and removes surrounding punctuation', () => {
		const extracted = extractUrls(
			'Open (Https://Example.COM/Long_Path?q=one&v=2), then docs.example.org/guide_(draft).'
		);

		expect(extracted.map((item) => item.value)).toEqual([
			'Https://Example.COM/Long_Path?q=one&v=2',
			'docs.example.org/guide_(draft)'
		]);
	});

	it('handles invisible Unicode inside an URL', () => {
		const extracted = extractUrls('https://exa\u200bmple.com/path');

		expect(extracted[0]?.value).toBe('https://example.com/path');
		expect(stripInvisibleUnicode('\u200ehello\ufeff')).toBe('hello');
	});

	it('does not treat the domain portion of an email as a bare URL', () => {
		const extracted = extractUrls('Email person@example.com or visit example.org.');

		expect(extracted.map((item) => item.value)).toEqual(['example.org']);
	});

	it('keeps balanced parentheses that belong to the URL', () => {
		const extracted = extractUrls('See https://en.example.org/wiki/Function_(math)).');

		expect(extracted[0]?.value).toBe('https://en.example.org/wiki/Function_(math)');
	});

	it('removes known tracking parameters without removing resource parameters', () => {
		const normalized = normalizeUrl(
			'HTTPS://Example.COM:443/watch?v=abc123&utm_source=chat&fbclid=tracking#chapter-2',
			DEFAULT_IMPORT_LIMITS
		);

		expect(normalized.normalizedUrl).toBe('https://example.com/watch?v=abc123#chapter-2');
		expect(normalized.domain).toBe('example.com');
	});

	it('preserves query order and meaningful fragments', () => {
		const normalized = normalizeUrl('example.com/item?b=2&a=1#details', DEFAULT_IMPORT_LIMITS);

		expect(normalized.normalizedUrl).toBe('https://example.com/item?b=2&a=1#details');
	});

	it('returns dangerous schemes as invalid review candidates', () => {
		const result = parseImport({
			content: 'javascript:alert(1) data:text/plain,hello file:///tmp/example'
		});

		expect(result.candidates).toHaveLength(3);
		expect(result.candidates.every((candidate) => !candidate.valid)).toBe(true);
		expect(result.candidates.map((candidate) => candidate.issues[0]?.code)).toEqual([
			'dangerous-scheme',
			'dangerous-scheme',
			'dangerous-scheme'
		]);
	});

	it('marks normalized duplicates within an import and against existing data', () => {
		const result = parseImport(
			{
				content:
					'https://example.com/page?id=7&utm_source=chat\nHTTPS://EXAMPLE.COM/page?id=7&fbclid=x'
			},
			{ existingNormalizedUrls: ['https://saved.example/item'] }
		);
		const existingResult = parseImport(
			{ content: 'saved.example/item' },
			{ existingNormalizedUrls: ['https://saved.example/item'] }
		);

		expect(result.candidates[1]?.duplicate).toEqual({
			kind: 'within-import',
			firstCandidateId: 'candidate-1'
		});
		expect(result.summary.duplicates).toBe(1);
		expect(existingResult.candidates[0]?.duplicate).toEqual({ kind: 'existing' });
	});

	it('rejects URLs beyond the configured character limit', () => {
		const result = parseImport(
			{ content: `https://example.com/${'a'.repeat(80)}` },
			{ limits: { maxUrlLength: 40 } }
		);

		expect(result.candidates[0]?.issues[0]?.code).toBe('url-too-long');
		expect(result.summary.invalid).toBe(1);
	});
});

describe('secret detection and masking', () => {
	it('detects URL credentials and sensitive query parameters without exposing them', () => {
		const secret = 'very-secret-token-value';
		const url = `https://demo:password@example.com/callback?token=${secret}&id=9`;
		const result = parseImport({ content: url });
		const candidate = result.candidates[0];

		expect(candidate?.secretFindings.map((finding) => finding.kind)).toEqual([
			'credentials',
			'sensitive-query'
		]);
		expect(candidate?.displayUrl).not.toContain(secret);
		expect(candidate?.displayUrl).not.toContain('password');
		expect(candidate?.sourceExcerpt).not.toContain(secret);
		expect(result.summary.withSecrets).toBe(1);
	});

	it('detects common tokens in surrounding text and masks excerpts', () => {
		const token = `ghp_${'A'.repeat(36)}`;
		const result = parseImport({ content: `Keep ${token} away from https://example.com/docs` });

		expect(result.candidates[0]?.secretFindings.some((item) => item.label === 'GitHub token')).toBe(
			true
		);
		expect(result.candidates[0]?.sourceExcerpt).toContain('[redacted]');
		expect(result.candidates[0]?.sourceExcerpt).not.toContain(token);
	});

	it('recognizes and masks webhook paths', () => {
		const webhook = 'https://hooks.slack.com/services/T000/B000/SECRET';

		expect(detectSecrets(webhook).map((item) => item.kind)).toContain('webhook');
		expect(maskSecrets(webhook)).toBe('https://hooks.slack.com/services/redacted');
	});
});

describe('format detection and parser interface', () => {
	it.each([
		['chat.txt', 'whatsapp', fakeWhatsApp],
		['data.json', 'json', '{"url":"https://example.com"}'],
		['links.csv', 'csv', 'name,url\nExample,https://example.com'],
		['notes.md', 'markdown', '# Links\n[Example](https://example.com)'],
		['page.html', 'html', '<a href="https://example.com">Example</a>'],
		[
			'bookmarks.html',
			'netscape-bookmarks',
			'<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><A HREF="https://example.com" ADD_DATE="1">Example</A></DL>'
		]
	] as const)('detects %s as %s', (filename, expected, content) => {
		expect(detectImportFormat({ filename, content }).format).toBe(expected);
	});

	it('allows a manual format override', () => {
		const detection = detectImportFormat({ content: '{not json}', format: 'text' });

		expect(detection).toMatchObject({ format: 'text', confidence: 1 });
	});

	it('gives an explicit file type priority over CSV-like punctuation', () => {
		const detection = detectImportFormat({
			filename: 'page.html',
			content: '<p>one,two,three</p>\n<p>four,five,six</p>'
		});

		expect(detection.format).toBe('html');
	});

	it('registers every parser behind the common interface', () => {
		const parsers = Object.values(IMPORT_PARSERS);

		expect(parsers).toHaveLength(7);
		expect(parsers.every((parser) => typeof parser.parse === 'function')).toBe(true);
		expect(new Set(parsers.map((parser) => parser.format)).size).toBe(7);
	});
});

describe('format parsers', () => {
	it('extracts only links and optional dates from a fake WhatsApp export', () => {
		const result = parseImport({ content: fakeWhatsApp, filename: 'chat.txt' });
		const serialized = JSON.stringify(result);

		expect(result.format).toBe('whatsapp');
		expect(result.summary).toMatchObject({ found: 6, valid: 5, invalid: 1, ignored: 2 });
		expect(result.candidates[0]).toMatchObject({
			normalizedUrl: 'https://example.com/article?id=42',
			sourceDate: '2024-02-03T09:06:02'
		});
		expect(result.candidates[1]?.normalizedUrl).toBe('https://docs.example.org/guide_(draft)');
		expect(result.candidates[4]?.normalizedUrl).toBe('https://example.net/invisible');
		expect(serialized).not.toContain('Alex Example');
		expect(serialized).not.toContain('Sam Sample');
		expect(serialized).not.toContain('ordinary fictional message');
	});

	it('walks nested JSON objects and arrays and keeps a nearby title', () => {
		const result = parseImport({
			filename: 'nested.json',
			content: JSON.stringify({
				items: [
					{ title: 'First', url: 'https://one.example/path' },
					{ nested: { values: ['text', 'See two.example/path and https://three.example'] } }
				]
			})
		});

		expect(result.candidates.map((candidate) => candidate.normalizedUrl)).toEqual([
			'https://one.example/path',
			'https://two.example/path',
			'https://three.example/'
		]);
		expect(result.candidates[0]?.title).toBe('First');
		expect(result.candidates[2]?.sourceLabel).toBe('$.items[1].nested.values[1]');
	});

	it('parses quoted CSV cells, all columns and title metadata', () => {
		const result = parseImport({
			filename: 'links.csv',
			content:
				'title,url,notes\n"One, saved",https://one.example/path,"Also https://two.example/a,b"\nNo link,,plain'
		});

		expect(result.candidates.map((candidate) => candidate.normalizedUrl)).toEqual([
			'https://one.example/path',
			'https://two.example/a,b'
		]);
		expect(result.candidates.every((candidate) => candidate.title === 'One, saved')).toBe(true);
		expect(result.summary.ignored).toBe(1);
	});

	it('inspects CSV headers and scans only the selected columns', () => {
		const content = 'url,notes\nhttps://primary.example/path,https://secondary.example/note';
		const columns = inspectCsvColumns(content, 'links.csv', { limits: DEFAULT_IMPORT_LIMITS });
		const result = parseImport(
			{ filename: 'links.csv', content },
			{ format: 'csv', csvColumns: [0] }
		);

		expect(columns).toEqual([
			{ index: 0, label: 'url' },
			{ index: 1, label: 'notes' }
		]);
		expect(result.candidates.map((candidate) => candidate.normalizedUrl)).toEqual([
			'https://primary.example/path'
		]);
	});

	it('parses Markdown links, autolinks, reference definitions and raw URLs once', () => {
		const result = parseImport({
			filename: 'links.md',
			content: [
				'[Named link](https://named.example/path)',
				'<https://auto.example/item>',
				'[reference]: https://reference.example/doc "Docs"',
				'Raw raw.example/page.'
			].join('\n')
		});

		expect(result.candidates.map((candidate) => candidate.normalizedUrl)).toEqual([
			'https://named.example/path',
			'https://reference.example/doc',
			'https://auto.example/item',
			'https://raw.example/page'
		]);
		expect(result.candidates[0]?.title).toBe('Named link');
	});

	it('parses HTML hrefs without executing or scanning script content', () => {
		const result = parseImport({
			filename: 'page.html',
			content: [
				'<script>const hidden = "https://hidden.example";</script>',
				'<a href="https://safe.example/path?a=1&amp;b=2"><strong>Safe link</strong></a>',
				'<a href="javascript:alert(1)">Unsafe</a>',
				'<p>Visible visible.example/info.</p>'
			].join('')
		});

		expect(result.candidates.map((candidate) => candidate.normalizedUrl)).toEqual([
			'https://safe.example/path?a=1&b=2',
			undefined,
			'https://visible.example/info'
		]);
		expect(result.candidates[0]?.title).toBe('Safe link');
		expect(result.candidates[1]?.issues[0]?.code).toBe('dangerous-scheme');
		expect(JSON.stringify(result)).not.toContain('hidden.example');
	});

	it('ignores the remainder of an unclosed active HTML element', () => {
		const result = parseImport({
			filename: 'broken.html',
			content: '<a href="https://safe.example">Safe</a><script>https://hidden.example'
		});

		expect(result.candidates.map((candidate) => candidate.normalizedUrl)).toEqual([
			'https://safe.example/'
		]);
	});

	it('parses Netscape bookmarks with folder paths and source dates', () => {
		const result = parseImport({
			filename: 'bookmarks.html',
			content: `<!DOCTYPE NETSCAPE-Bookmark-file-1>
				<DL><p><DT><H3>Research</H3><DL><p>
				<DT><A HREF="https://docs.example/guide" ADD_DATE="1700000000">Guide</A>
				<DT><H3>Nested</H3><DL><p>
				<DT><A HREF="https://nested.example/item">Nested item</A>
				</DL><p></DL><p></DL>`
		});

		expect(result.format).toBe('netscape-bookmarks');
		expect(result.candidates[0]).toMatchObject({
			title: 'Guide',
			collectionPath: ['Research'],
			sourceDate: '2023-11-14T22:13:20.000Z'
		});
		expect(result.candidates[1]?.collectionPath).toEqual(['Research', 'Nested']);
	});
});

describe('safe limits', () => {
	it('rejects input above the byte limit before parsing', () => {
		expect(() =>
			parseImport({ content: 'é'.repeat(20) }, { limits: { maxInputBytes: 30 } })
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'input-size' }));
	});

	it('rejects deeply nested JSON before JSON.parse traversal', () => {
		expect(() =>
			parseImport(
				{ content: '[[[[["https://example.com"]]]]]', filename: 'deep.json' },
				{ limits: { maxJsonDepth: 4 } }
			)
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'json-depth' }));
	});

	it('caps JSON node traversal', () => {
		expect(() =>
			parseImport(
				{ content: JSON.stringify([1, 2, 3, 4]), filename: 'nodes.json' },
				{ limits: { maxJsonNodes: 3 } }
			)
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'json-nodes' }));
	});

	it('caps individual JSON strings', () => {
		expect(() =>
			parseImport(
				{ content: JSON.stringify('x'.repeat(21)), filename: 'string.json' },
				{ limits: { maxStringLength: 20 } }
			)
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'string-length' }));
	});

	it('caps CSV rows and columns', () => {
		expect(() =>
			parseImport({ content: 'a,b\n1,2\n3,4', filename: 'rows.csv' }, { limits: { maxCsvRows: 2 } })
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'csv-rows' }));
		expect(() =>
			parseImport(
				{ content: 'a,b,c\n1,2,3', filename: 'columns.csv' },
				{ limits: { maxCsvColumns: 2 } }
			)
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'csv-columns' }));
	});

	it('caps candidate counts', () => {
		expect(() =>
			parseImport(
				{ content: 'https://one.example https://two.example https://three.example' },
				{ limits: { maxCandidates: 2 } }
			)
		).toThrowError(expect.objectContaining<Partial<ImportLimitError>>({ code: 'candidate-count' }));
	});
});
