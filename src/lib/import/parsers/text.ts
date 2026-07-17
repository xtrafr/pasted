import { appendUrlsFromText } from '../parser-utils';
import type { ImportParser, RawParserResult } from '../types';

export const textParser: ImportParser = {
	format: 'text',
	parse(input, context): RawParserResult {
		const candidates: RawParserResult['candidates'] = [];
		let ignoredCount = 0;
		const lines = input.content.split(/\r?\n/);

		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index] ?? '';
			if (!line.trim()) continue;
			const count = appendUrlsFromText(candidates, line, context, {
				sourceLabel: `Line ${index + 1}`
			});
			if (count === 0) ignoredCount += 1;
		}

		return { format: 'text', candidates, ignoredCount, warnings: [] };
	}
};
