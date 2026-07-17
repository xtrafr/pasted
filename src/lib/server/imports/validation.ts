import { z } from 'zod';

export const MAX_IMPORT_CANDIDATES = 10_000;
export const MAX_IMPORT_BATCH_SIZE = 100;

export const clientImportFormatSchema = z.enum([
	'text',
	'whatsapp',
	'json',
	'pasted-json',
	'csv',
	'markdown',
	'html',
	'netscape-bookmarks'
]);

export const genericSourceTypeSchema = z.enum([
	'text',
	'whatsapp',
	'json',
	'pasted',
	'csv',
	'markdown',
	'html',
	'browser-bookmarks'
]);

const idempotencyKeySchema = z
	.string()
	.trim()
	.min(8)
	.max(128)
	.regex(
		/^[a-z0-9._:-]+$/i,
		'Idempotency keys may contain letters, numbers, dots, colons, underscores, and hyphens'
	);

const candidateKeySchema = z
	.string()
	.trim()
	.min(1)
	.max(200)
	.regex(/^[a-z0-9._:-]+$/i, 'Candidate keys contain unsupported characters');

const uuidSchema = z.string().uuid();
const tagIdsSchema = z
	.array(uuidSchema)
	.max(50)
	.transform((values) => [...new Set(values)]);
const candidateKeysSchema = z
	.array(candidateKeySchema)
	.max(MAX_IMPORT_CANDIDATES)
	.transform((values) => [...new Set(values)]);

const secretKindSchema = z.enum([
	'credentials',
	'sensitive-query',
	'api-key',
	'access-token',
	'jwt',
	'webhook'
]);

const candidateSchema = z
	.object({
		id: candidateKeySchema,
		originalUrl: z.string().trim().min(1).max(8_192),
		title: z.string().trim().min(1).max(300).nullable().optional(),
		sourceDate: z.string().datetime({ offset: true, local: true }).optional(),
		selected: z.boolean().optional(),
		secretKinds: z
			.array(secretKindSchema)
			.max(12)
			.transform((values) => [...new Set(values)])
			.optional()
	})
	.strict();

export const createImportSchema = z
	.object({
		idempotencyKey: idempotencyKeySchema,
		format: clientImportFormatSchema,
		sourceType: genericSourceTypeSchema.optional(),
		collectionId: uuidSchema.nullable().optional(),
		tagIds: tagIdsSchema.optional(),
		ignoredCount: z.number().int().min(0).max(1_000_000).default(0),
		candidates: z.array(candidateSchema).min(1).max(MAX_IMPORT_CANDIDATES)
	})
	.strict()
	.superRefine((value, context) => {
		const seen = new Set<string>();
		for (const [index, candidate] of value.candidates.entries()) {
			if (seen.has(candidate.id)) {
				context.addIssue({
					code: 'custom',
					path: ['candidates', index, 'id'],
					message: 'Candidate keys must be unique within an import'
				});
			}
			seen.add(candidate.id);
		}
	});

const candidateTitleSchema = z
	.object({
		candidateKey: candidateKeySchema,
		title: z.string().trim().min(1).max(300).nullable()
	})
	.strict();

export const updateImportReviewSchema = z
	.object({
		selectedCandidateKeys: candidateKeysSchema.optional(),
		candidateTitles: z.array(candidateTitleSchema).max(MAX_IMPORT_CANDIDATES).optional(),
		collectionId: uuidSchema.nullable().optional(),
		tagIds: tagIdsSchema.optional(),
		sourceType: genericSourceTypeSchema.optional()
	})
	.strict()
	.superRefine((value, context) => {
		if (Object.values(value).every((field) => field === undefined)) {
			context.addIssue({ code: 'custom', message: 'At least one review field must be provided' });
		}

		if (value.candidateTitles) {
			const seen = new Set<string>();
			for (const [index, edit] of value.candidateTitles.entries()) {
				if (seen.has(edit.candidateKey)) {
					context.addIssue({
						code: 'custom',
						path: ['candidateTitles', index, 'candidateKey'],
						message: 'A candidate title may only be edited once per request'
					});
				}
				seen.add(edit.candidateKey);
			}
		}
	});

export const importBatchSchema = z
	.object({
		idempotencyKey: idempotencyKeySchema,
		batchSize: z.number().int().min(1).max(MAX_IMPORT_BATCH_SIZE).default(50)
	})
	.strict();

export const retryImportSchema = z
	.object({
		idempotencyKey: idempotencyKeySchema,
		candidateKeys: candidateKeysSchema.optional()
	})
	.strict();

export type ClientImportFormat = z.output<typeof clientImportFormatSchema>;
export type GenericSourceType = z.output<typeof genericSourceTypeSchema>;
export type CreateImportInput = z.input<typeof createImportSchema>;
export type ParsedCreateImport = z.output<typeof createImportSchema>;
export type ParsedImportCandidate = ParsedCreateImport['candidates'][number];
export type UpdateImportReviewInput = z.input<typeof updateImportReviewSchema>;
export type ParsedUpdateImportReview = z.output<typeof updateImportReviewSchema>;
export type ImportBatchInput = z.input<typeof importBatchSchema>;
export type ParsedImportBatch = z.output<typeof importBatchSchema>;
export type RetryImportInput = z.input<typeof retryImportSchema>;
export type ParsedRetryImport = z.output<typeof retryImportSchema>;

export type DatabaseImportFormat =
	'text' | 'whatsapp' | 'json' | 'pasted_json' | 'csv' | 'markdown' | 'html' | 'netscape_bookmarks';

export function databaseImportFormat(format: ClientImportFormat): DatabaseImportFormat {
	if (format === 'pasted-json') return 'pasted_json';
	if (format === 'netscape-bookmarks') return 'netscape_bookmarks';
	return format;
}

export function defaultSourceType(format: ClientImportFormat): GenericSourceType {
	if (format === 'pasted-json') return 'pasted';
	if (format === 'netscape-bookmarks') return 'browser-bookmarks';
	return format;
}
