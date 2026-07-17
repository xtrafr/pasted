import { describe, expect, it } from 'vitest';
import {
	buildImportProgress,
	hashImportRequest,
	isDuplicateAllowed,
	planImportCandidates,
	planRetry,
	planReviewSelection,
	selectedImportPayload,
	stateAfterBatch
} from './planning';
import { createImportSchema } from './validation';

function parsedCandidates() {
	return createImportSchema.parse({
		idempotencyKey: 'import:019f705f-07ba-7611-93a8-5cbe9331ddb2',
		format: 'whatsapp',
		candidates: [
			{
				id: 'new',
				originalUrl: 'Example.com/article?utm_source=test',
				sourceDate: '2024-02-03T09:06:02'
			},
			{ id: 'file-duplicate', originalUrl: 'https://example.com/article', selected: true },
			{ id: 'account-duplicate', originalUrl: 'https://saved.example/path' },
			{ id: 'invalid', originalUrl: 'javascript:alert(1)' },
			{ id: 'credentials', originalUrl: 'https://person:secret@example.net/private' },
			{
				id: 'secret',
				originalUrl: 'https://tokens.example/resource?access_token=very-secret-value',
				title: 'Useful token page'
			}
		]
	}).candidates;
}

describe('import planning', () => {
	it('normalizes candidates and assigns file, account, invalid, and secret states', () => {
		const planned = planImportCandidates(
			parsedCandidates(),
			new Set(['https://saved.example/path'])
		);

		expect(
			planned.map(({ candidateKey, state, selected }) => ({ candidateKey, state, selected }))
		).toEqual([
			{ candidateKey: 'new', state: 'new', selected: true },
			{ candidateKey: 'file-duplicate', state: 'duplicate_file', selected: true },
			{ candidateKey: 'account-duplicate', state: 'duplicate_account', selected: false },
			{ candidateKey: 'invalid', state: 'invalid', selected: false },
			{ candidateKey: 'credentials', state: 'invalid', selected: false },
			{ candidateKey: 'secret', state: 'new', selected: true }
		]);
		expect(planned[0]?.normalizedUrl).toBe('https://example.com/article');
		expect(planned[0]?.sourceDate?.toISOString()).toBe('2024-02-03T09:06:02.000Z');
		expect(planned[4]?.errorCode).toBe('credentials_not_allowed');
		expect(planned[5]?.secretKinds).toContain('sensitive-query');
	});

	it('computes progress and terminal state from persisted candidate states', () => {
		const rows = [
			{ candidateKey: 'one', state: 'imported' as const, selected: true },
			{ candidateKey: 'two', state: 'new' as const, selected: true },
			{ candidateKey: 'three', state: 'duplicate_account' as const, selected: false },
			{ candidateKey: 'four', state: 'invalid' as const, selected: false }
		];

		expect(buildImportProgress(rows, 'reviewing')).toEqual({
			total: 4,
			valid: 3,
			duplicates: 1,
			invalid: 1,
			selected: 2,
			pending: 1,
			imported: 1,
			failed: 0,
			skipped: 0,
			processed: 1,
			percent: 50
		});
		expect(stateAfterBatch(rows)).toBe('reviewing');
		expect(
			stateAfterBatch(
				rows.map((row) => (row.state === 'new' ? { ...row, state: 'imported' } : row))
			)
		).toBe('completed');
	});

	it('separates selectable, unknown, and invalid review keys', () => {
		const rows = [
			{ candidateKey: 'new', state: 'new' as const, selected: true },
			{ candidateKey: 'bad', state: 'invalid' as const, selected: false },
			{ candidateKey: 'done', state: 'imported' as const, selected: true }
		];

		expect(planReviewSelection(rows, ['new', 'bad', 'done', 'missing'])).toEqual({
			selectableKeys: ['new'],
			unknownKeys: ['missing'],
			ineligibleKeys: ['bad']
		});
	});

	it('plans only failed retries and preserves explicit duplicate permission markers', () => {
		const rows = [
			{ candidateKey: 'failed', state: 'failed' as const, selected: true },
			{ candidateKey: 'new', state: 'new' as const, selected: true }
		];

		expect(planRetry(rows, ['failed', 'new', 'missing'])).toEqual({
			retryKeys: ['failed'],
			unknownKeys: ['missing'],
			notFailedKeys: ['new']
		});
		expect(isDuplicateAllowed('new', 'import_failed_duplicate_allowed')).toBe(true);
	});

	it('hashes logically identical candidate sets consistently', () => {
		const first = createImportSchema.parse({
			idempotencyKey: 'import:019f705f',
			format: 'text',
			tagIds: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'],
			candidates: [
				{ id: 'two', originalUrl: 'https://two.example' },
				{ id: 'one', originalUrl: 'https://one.example' }
			]
		});
		const second = createImportSchema.parse({
			...first,
			tagIds: [...(first.tagIds ?? [])].reverse(),
			candidates: [...first.candidates].reverse()
		});

		expect(hashImportRequest(first)).toBe(hashImportRequest(second));
	});

	it('discards deselected candidates before persistence and idempotency hashing', () => {
		const input = createImportSchema.parse({
			idempotencyKey: 'import:privacy-filter',
			format: 'text',
			candidates: [
				{ id: 'kept', originalUrl: 'https://kept.example/path', selected: true },
				{
					id: 'private-deselection',
					originalUrl: 'https://deselected.example/private-path',
					selected: false
				}
			]
		});
		const filtered = selectedImportPayload(input);
		const withoutDeselection = createImportSchema.parse({
			...input,
			candidates: [input.candidates[0]!]
		});

		expect(filtered.candidates).toEqual([input.candidates[0]]);
		expect(JSON.stringify(filtered)).not.toContain('deselected.example');
		expect(hashImportRequest(filtered)).toBe(hashImportRequest(withoutDeselection));
	});
});
