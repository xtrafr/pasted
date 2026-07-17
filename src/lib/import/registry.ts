import { netscapeBookmarksParser } from './parsers/bookmarks';
import { csvParser } from './parsers/csv';
import { htmlParser } from './parsers/html';
import { jsonParser } from './parsers/json';
import { markdownParser } from './parsers/markdown';
import { textParser } from './parsers/text';
import { whatsAppParser } from './parsers/whatsapp';
import type { ImportFormat, ImportParser } from './types';

export const IMPORT_PARSERS: Readonly<Record<ImportFormat, ImportParser>> = Object.freeze({
	text: textParser,
	whatsapp: whatsAppParser,
	json: jsonParser,
	csv: csvParser,
	markdown: markdownParser,
	html: htmlParser,
	'netscape-bookmarks': netscapeBookmarksParser
});

export function getImportParser(format: ImportFormat): ImportParser {
	return IMPORT_PARSERS[format];
}
