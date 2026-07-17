import { appendUrlsFromText } from '../parser-utils';
import { stripInvisibleUnicode } from '../unicode';
import type { ImportParser, RawParserResult } from '../types';

export const WHATSAPP_HEADER =
	/^\s*\[?(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\]?\s*(?:-\s*)?[^:\r\n]{1,100}:\s?(.*)$/i;

interface WhatsAppMessage {
	body: string;
	sourceDate: string | undefined;
	sequence: number;
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function parseSourceDate(match: RegExpExecArray): string | undefined {
	const day = Number(match[1]);
	const month = Number(match[2]);
	let year = Number(match[3]);
	let hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = Number(match[6] ?? 0);
	const period = match[7]?.replace(/\./g, '').toLowerCase();

	if (year < 100) year += year >= 70 ? 1900 : 2000;
	if (period === 'pm' && hour < 12) hour += 12;
	if (period === 'am' && hour === 12) hour = 0;
	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59 ||
		second < 0 ||
		second > 59
	) {
		return undefined;
	}

	const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return undefined;
	}

	return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function countWhatsAppHeaders(content: string, maximum = 20): number {
	let count = 0;
	for (const line of stripInvisibleUnicode(content).split(/\r?\n/)) {
		if (WHATSAPP_HEADER.test(line)) count += 1;
		if (count >= maximum) break;
	}
	return count;
}

function collectMessages(content: string): WhatsAppMessage[] {
	const messages: WhatsAppMessage[] = [];
	let current: WhatsAppMessage | undefined;

	for (const line of stripInvisibleUnicode(content).split(/\r?\n/)) {
		const header = WHATSAPP_HEADER.exec(line);
		if (header) {
			if (current) messages.push(current);
			current = {
				body: header[8] ?? '',
				sourceDate: parseSourceDate(header),
				sequence: messages.length + 1
			};
		} else if (current) {
			current.body += `\n${line}`;
		}
	}
	if (current) messages.push(current);
	return messages;
}

export const whatsAppParser: ImportParser = {
	format: 'whatsapp',
	parse(input, context): RawParserResult {
		const candidates: RawParserResult['candidates'] = [];
		let ignoredCount = 0;

		for (const message of collectMessages(input.content)) {
			const before = candidates.length;
			const links = appendUrlsFromText(candidates, message.body, context, {
				...(message.sourceDate ? { sourceDate: message.sourceDate } : {}),
				sourceLabel: `WhatsApp message ${message.sequence}`,
				sourceExcerpt: ''
			});
			for (let index = before; index < candidates.length; index += 1) {
				const candidate = candidates[index];
				if (candidate) candidate.sourceExcerpt = candidate.rawUrl;
			}
			if (links === 0) ignoredCount += 1;
		}

		return { format: 'whatsapp', candidates, ignoredCount, warnings: [] };
	}
};
