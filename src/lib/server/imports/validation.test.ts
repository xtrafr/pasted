import { describe, expect, it } from 'vitest';
import {
	createImportSchema,
	databaseImportFormat,
	defaultSourceType,
	importBatchSchema,
	retryImportSchema,
	updateImportReviewSchema
} from './validation';

const validCreateRequest = {
	idempotencyKey: 'import:019f705f-07ba-7611-93a8-5cbe9331ddb2',
	format: 'whatsapp' as const,
	candidates: [
		{
			id: 'candidate-1',
			originalUrl: 'https://example.com/article',
			sourceDate: '2026-07-17T12:00:00+02:00',
			secretKinds: ['sensitive-query' as const]
		}
	]
};

describe('import request validation', () => {
	it('accepts the minimum sanitized client candidate contract', () => {
		const result = createImportSchema.parse(validCreateRequest);

		expect(result.ignoredCount).toBe(0);
		expect(result.candidates[0]?.id).toBe('candidate-1');
	});

	it('accepts the zone-free UTC timestamp emitted by the WhatsApp parser', () => {
		const result = createImportSchema.safeParse({
			...validCreateRequest,
			candidates: [{ ...validCreateRequest.candidates[0], sourceDate: '2024-02-03T09:06:02' }]
		});

		expect(result.success).toBe(true);
	});

	it.each([
		['sender', { sender: 'Private Person' }],
		['sourceExcerpt', { sourceExcerpt: 'Private chat text' }],
		['chatText', { chatText: 'A complete conversation' }]
	])('rejects the raw %s candidate field', (_field, privateField) => {
		const request = {
			...validCreateRequest,
			candidates: [{ ...validCreateRequest.candidates[0], ...privateField }]
		};

		expect(createImportSchema.safeParse(request).success).toBe(false);
	});

	it('rejects filenames and source labels at the session boundary', () => {
		expect(
			createImportSchema.safeParse({ ...validCreateRequest, fileName: '_chat.txt' }).success
		).toBe(false);
		expect(
			createImportSchema.safeParse({ ...validCreateRequest, sourceLabel: 'Person Name' }).success
		).toBe(false);
	});

	it('requires unique stable candidate keys', () => {
		const request = {
			...validCreateRequest,
			candidates: [validCreateRequest.candidates[0], validCreateRequest.candidates[0]]
		};

		expect(createImportSchema.safeParse(request).success).toBe(false);
	});

	it('maps public format names and derives generic source types', () => {
		expect(databaseImportFormat('pasted-json')).toBe('pasted_json');
		expect(databaseImportFormat('netscape-bookmarks')).toBe('netscape_bookmarks');
		expect(defaultSourceType('whatsapp')).toBe('whatsapp');
		expect(defaultSourceType('netscape-bookmarks')).toBe('browser-bookmarks');
	});

	it('validates idempotent batches, retries, and strict review updates', () => {
		expect(importBatchSchema.parse({ idempotencyKey: 'batch:019f705f', batchSize: 100 })).toEqual({
			idempotencyKey: 'batch:019f705f',
			batchSize: 100
		});
		expect(retryImportSchema.parse({ idempotencyKey: 'retry:019f705f' })).toEqual({
			idempotencyKey: 'retry:019f705f'
		});
		expect(updateImportReviewSchema.safeParse({}).success).toBe(false);
		expect(
			updateImportReviewSchema.safeParse({ selectedCandidateKeys: [], sender: 'Private Person' })
				.success
		).toBe(false);
	});
});
