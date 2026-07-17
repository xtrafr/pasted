import { ImportLimitError } from '../limits';
import { appendUrlsFromText, cleanTitle } from '../parser-utils';
import { extractUrls } from '../urls';
import type { ImportParser, ParserContext, RawParserResult } from '../types';

const DELIMITERS = [',', ';', '\t'] as const;

function countDelimiter(line: string, delimiter: string): number {
	let count = 0;
	let quoted = false;
	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];
		if (character === '"') {
			if (quoted && line[index + 1] === '"') index += 1;
			else quoted = !quoted;
		} else if (!quoted && character === delimiter) {
			count += 1;
		}
	}
	return count;
}

export function detectCsvDelimiter(content: string, filename?: string): string {
	if (filename?.toLowerCase().endsWith('.tsv')) return '\t';
	const lines = content.split(/\r?\n/).filter(Boolean).slice(0, 20);
	let bestDelimiter = ',';
	let bestScore = -1;
	for (const delimiter of DELIMITERS) {
		const counts = lines
			.map((line) => countDelimiter(line, delimiter))
			.filter((count) => count > 0);
		if (counts.length === 0) continue;
		const range = Math.max(...counts) - Math.min(...counts);
		const score = counts.length * 100 + counts.reduce((sum, count) => sum + count, 0) - range * 5;
		if (score > bestScore) {
			bestScore = score;
			bestDelimiter = delimiter;
		}
	}
	return bestDelimiter;
}

function parseRows(content: string, delimiter: string, context: ParserContext): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;

	const pushCell = (): void => {
		if (cell.length > context.limits.maxStringLength) {
			throw new ImportLimitError(
				'string-length',
				context.limits.maxStringLength,
				'CSV cell exceeds the character limit'
			);
		}
		row.push(cell);
		cell = '';
		if (row.length > context.limits.maxCsvColumns) {
			throw new ImportLimitError(
				'csv-columns',
				context.limits.maxCsvColumns,
				`CSV row contains more than ${context.limits.maxCsvColumns} columns`
			);
		}
	};

	const pushRow = (): void => {
		pushCell();
		rows.push(row);
		row = [];
		if (rows.length > context.limits.maxCsvRows) {
			throw new ImportLimitError(
				'csv-rows',
				context.limits.maxCsvRows,
				`CSV contains more than ${context.limits.maxCsvRows} rows`
			);
		}
	};

	for (let index = 0; index < content.length; index += 1) {
		const character = content[index];
		if (character === '"') {
			if (quoted && content[index + 1] === '"') {
				cell += '"';
				index += 1;
			} else if (!quoted && cell.length === 0) {
				quoted = true;
			} else if (quoted) {
				quoted = false;
			} else {
				cell += character;
			}
		} else if (!quoted && character === delimiter) {
			pushCell();
		} else if (!quoted && (character === '\n' || character === '\r')) {
			if (character === '\r' && content[index + 1] === '\n') index += 1;
			pushRow();
		} else {
			cell += character;
			if (cell.length > context.limits.maxStringLength) {
				throw new ImportLimitError(
					'string-length',
					context.limits.maxStringLength,
					'CSV cell exceeds the character limit'
				);
			}
		}
	}

	if (quoted) throw new SyntaxError('Invalid CSV import: unterminated quoted field');
	if (cell.length > 0 || row.length > 0) pushRow();
	return rows;
}

function hasHeader(row: string[] | undefined): boolean {
	if (!row || row.length === 0) return false;
	return (
		row.every((cell) => extractUrls(cell).length === 0) && row.some((cell) => /[a-z]/i.test(cell))
	);
}

export const csvParser: ImportParser = {
	format: 'csv',
	parse(input, context): RawParserResult {
		const delimiter = detectCsvDelimiter(input.content, input.filename);
		const rows = parseRows(input.content, delimiter, context);
		const headerPresent = hasHeader(rows[0]);
		const headers = headerPresent ? rows[0]?.map((cell) => cell.trim()) : undefined;
		const titleIndex = headers?.findIndex((header) => /^(?:label|name|title)$/i.test(header));
		const candidates: RawParserResult['candidates'] = [];
		let ignoredCount = 0;

		for (let rowIndex = headerPresent ? 1 : 0; rowIndex < rows.length; rowIndex += 1) {
			const row = rows[rowIndex] ?? [];
			let linksInRow = 0;
			for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
				const cell = row[columnIndex] ?? '';
				if (!cell) continue;
				const column = headers?.[columnIndex] || `column ${columnIndex + 1}`;
				const title =
					titleIndex !== undefined && titleIndex >= 0 ? cleanTitle(row[titleIndex]) : undefined;
				linksInRow += appendUrlsFromText(candidates, cell, context, {
					...(title ? { title } : {}),
					sourceLabel: `CSV row ${rowIndex + 1}, ${column}`
				});
			}
			if (linksInRow === 0 && row.some((cell) => cell.trim())) ignoredCount += 1;
		}

		return { format: 'csv', candidates, ignoredCount, warnings: [] };
	}
};
