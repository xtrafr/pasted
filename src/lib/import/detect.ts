import { detectCsvDelimiter } from './parsers/csv';
import { countWhatsAppHeaders } from './parsers/whatsapp';
import type { FormatDetection, ImportFormat, ImportInput } from './types';

function extension(filename?: string): string | undefined {
	const match = /\.([a-z0-9]+)$/i.exec(filename ?? '');
	return match?.[1]?.toLowerCase();
}

function detection(
	format: ImportFormat,
	confidence: number,
	...reasons: string[]
): FormatDetection {
	return { format, confidence, reasons };
}

function looksLikeCsv(content: string, filename?: string): boolean {
	const delimiter = detectCsvDelimiter(content, filename);
	const lines = content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 8);
	if (lines.length < 2) return false;
	return lines.filter((line) => line.includes(delimiter)).length >= Math.min(3, lines.length);
}

export function detectImportFormat(
	input: ImportInput,
	forcedFormat?: ImportFormat
): FormatDetection {
	const forced = forcedFormat ?? input.format;
	if (forced) return detection(forced, 1, 'Format selected explicitly');

	const ext = extension(input.filename);
	const mimeType = input.mimeType?.toLowerCase();
	const content = input.content;
	const trimmed = content.trim();

	if (
		/<!doctype\s+netscape-bookmark-file-1/i.test(content) ||
		(/<dl\b/i.test(content) && /<a\b[^>]*\badd_date\s*=/i.test(content))
	) {
		return detection('netscape-bookmarks', 0.99, 'Netscape bookmark markers found');
	}

	const whatsappHeaders = countWhatsAppHeaders(content);
	if (whatsappHeaders >= 2) {
		return detection('whatsapp', 0.98, `${whatsappHeaders} WhatsApp message headers found`);
	}
	if (whatsappHeaders === 1 && (ext === 'txt' || mimeType === 'text/plain')) {
		return detection('whatsapp', 0.86, 'A WhatsApp message header was found in text');
	}

	if (ext === 'json' || mimeType === 'application/json') {
		return detection('json', 0.96, 'JSON filename or MIME type');
	}
	if (ext === 'csv' || ext === 'tsv' || mimeType === 'text/csv') {
		return detection('csv', 0.96, 'Delimited text filename or MIME type');
	}
	if (ext === 'md' || ext === 'markdown' || mimeType === 'text/markdown') {
		return detection('markdown', 0.96, 'Markdown filename or MIME type');
	}
	if (ext === 'html' || ext === 'htm' || mimeType === 'text/html') {
		return detection('html', 0.94, 'HTML filename or MIME type');
	}

	if (
		(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
	) {
		return detection('json', 0.82, 'Content has a JSON container shape');
	}

	if (/<(?:html|body|a)\b[^>]*>/i.test(content)) {
		return detection('html', 0.76, 'HTML elements found');
	}
	if (/^#{1,6}\s+\S/m.test(content) || /\[[^\]]+\]\([^)]+\)/.test(content)) {
		return detection('markdown', 0.78, 'Markdown structure found');
	}
	if (looksLikeCsv(content, input.filename)) {
		return detection('csv', 0.72, 'Several rows use a consistent delimiter');
	}

	return detection('text', 0.6, 'No more specific format was detected');
}
