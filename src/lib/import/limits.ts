import type { ImportLimits } from './types';

export type ImportLimitCode =
	| 'input-size'
	| 'candidate-count'
	| 'json-depth'
	| 'json-nodes'
	| 'string-length'
	| 'csv-rows'
	| 'csv-columns';

export class ImportLimitError extends Error {
	readonly code: ImportLimitCode;
	readonly limit: number;

	constructor(code: ImportLimitCode, limit: number, message: string) {
		super(message);
		this.name = 'ImportLimitError';
		this.code = code;
		this.limit = limit;
	}
}

export const DEFAULT_IMPORT_LIMITS: Readonly<ImportLimits> = Object.freeze({
	maxInputBytes: 10 * 1024 * 1024,
	maxCandidates: 10_000,
	maxUrlLength: 8_192,
	maxExcerptLength: 180,
	maxJsonDepth: 64,
	maxJsonNodes: 100_000,
	maxStringLength: 1024 * 1024,
	maxCsvRows: 50_000,
	maxCsvColumns: 250
});

export function resolveImportLimits(overrides?: Partial<ImportLimits>): ImportLimits {
	const limits = { ...DEFAULT_IMPORT_LIMITS, ...overrides };
	for (const [name, value] of Object.entries(limits)) {
		if (!Number.isSafeInteger(value) || value <= 0) {
			throw new TypeError(`${name} must be a positive safe integer`);
		}
	}
	return limits;
}

export function utf8ByteLength(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

export function assertInputSize(content: string, limits: ImportLimits): void {
	const size = utf8ByteLength(content);
	if (size > limits.maxInputBytes) {
		throw new ImportLimitError(
			'input-size',
			limits.maxInputBytes,
			`Import is ${size} bytes and exceeds the ${limits.maxInputBytes} byte limit`
		);
	}
}

export function assertCandidateCount(count: number, limits: ImportLimits): void {
	if (count > limits.maxCandidates) {
		throw new ImportLimitError(
			'candidate-count',
			limits.maxCandidates,
			`Import contains more than ${limits.maxCandidates} link candidates`
		);
	}
}

export function assertJsonDepth(content: string, limits: ImportLimits): void {
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (const character of content) {
		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === '"') {
				inString = false;
			}
			continue;
		}

		if (character === '"') {
			inString = true;
		} else if (character === '{' || character === '[') {
			depth += 1;
			if (depth > limits.maxJsonDepth) {
				throw new ImportLimitError(
					'json-depth',
					limits.maxJsonDepth,
					`JSON nesting exceeds the depth limit of ${limits.maxJsonDepth}`
				);
			}
		} else if (character === '}' || character === ']') {
			depth = Math.max(0, depth - 1);
		}
	}
}
