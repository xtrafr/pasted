import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { maskSecrets } from '$lib/import/secrets';
import { db } from '$lib/server/db';
import { importResults, importSessions, links, linkTargets } from '$lib/server/db/schema';
import {
	ServiceError,
	conflict,
	duplicateLink,
	notFound,
	parseInput,
	toServiceError
} from '$lib/server/errors';
import { enqueueOwnedMetadataBestEffort } from '$lib/server/jobs';
import {
	findExistingLinkItem,
	findOrCreateLinkTarget,
	insertLinkDetails
} from '$lib/server/repositories/content.repository';
import {
	insertBaseItem,
	refreshSearchDocuments,
	replaceItemTags
} from '$lib/server/repositories/items.repository';
import type { DatabaseExecutor, DatabaseTransaction } from '$lib/server/repositories/types';
import {
	normalizeServiceUrl,
	scopedUserId,
	serviceOperation,
	validateRelations
} from '$lib/server/services/internal';
import {
	buildImportProgress,
	hashImportRequest,
	isDuplicateAllowed,
	planImportCandidates,
	planRetry,
	planReviewSelection,
	selectedImportPayload,
	stateAfterBatch,
	type ImportCandidateState
} from './planning';
import {
	createImportSchema,
	databaseImportFormat,
	defaultSourceType,
	genericSourceTypeSchema,
	importBatchSchema,
	retryImportSchema,
	updateImportReviewSchema,
	type CreateImportInput,
	type GenericSourceType,
	type ImportBatchInput,
	type RetryImportInput,
	type UpdateImportReviewInput
} from './validation';

type ImportSession = typeof importSessions.$inferSelect;
type ImportResultRow = typeof importResults.$inferSelect;
type ImportSessionState = ImportSession['state'];
type ImportResultState = ImportResultRow['state'];

interface StoredImportOptions {
	requestHash: string;
	sourceType: GenericSourceType;
	collectionId: string | null;
	tagIds: string[];
	processedBatchKeys: string[];
	processedRetryKeys: string[];
}

const importIdSchema = z.string().uuid();
const ACTIVE_RESULT_STATES: ImportResultState[] = ['new', 'duplicate_file', 'duplicate_account'];

function storedOptions(value: Record<string, unknown>): StoredImportOptions {
	const sourceTypeResult = genericSourceTypeSchema.safeParse(value.sourceType);
	return {
		requestHash: typeof value.requestHash === 'string' ? value.requestHash : '',
		sourceType: sourceTypeResult.success ? sourceTypeResult.data : 'text',
		collectionId: typeof value.collectionId === 'string' ? value.collectionId : null,
		tagIds: Array.isArray(value.tagIds)
			? value.tagIds.filter((tagId): tagId is string => typeof tagId === 'string')
			: [],
		processedBatchKeys: Array.isArray(value.processedBatchKeys)
			? value.processedBatchKeys.filter((key): key is string => typeof key === 'string')
			: [],
		processedRetryKeys: Array.isArray(value.processedRetryKeys)
			? value.processedRetryKeys.filter((key): key is string => typeof key === 'string')
			: []
	};
}

function serializeOptions(options: StoredImportOptions): Record<string, unknown> {
	return {
		requestHash: options.requestHash,
		sourceType: options.sourceType,
		collectionId: options.collectionId,
		tagIds: options.tagIds,
		processedBatchKeys: options.processedBatchKeys,
		processedRetryKeys: options.processedRetryKeys
	};
}

function appendOperationKey(keys: readonly string[], key: string): string[] {
	return [...keys.filter((existing) => existing !== key), key].slice(-10_000);
}

function clientFormat(format: ImportSession['format']): string {
	if (format === 'pasted_json') return 'pasted-json';
	if (format === 'netscape_bookmarks') return 'netscape-bookmarks';
	return format;
}

async function findSessionByKey(
	executor: DatabaseExecutor,
	userId: string,
	idempotencyKey: string
): Promise<ImportSession | undefined> {
	const [session] = await executor
		.select()
		.from(importSessions)
		.where(
			and(eq(importSessions.userId, userId), eq(importSessions.idempotencyKey, idempotencyKey))
		)
		.limit(1);
	return session;
}

async function requireSession(
	executor: DatabaseExecutor,
	userId: string,
	importSessionId: string
): Promise<ImportSession> {
	const [session] = await executor
		.select()
		.from(importSessions)
		.where(and(eq(importSessions.userId, userId), eq(importSessions.id, importSessionId)))
		.limit(1);
	if (!session) throw notFound('Import session');
	return session;
}

async function lockSession(
	executor: DatabaseTransaction,
	userId: string,
	importSessionId: string
): Promise<ImportSession> {
	const [session] = await executor
		.select()
		.from(importSessions)
		.where(and(eq(importSessions.userId, userId), eq(importSessions.id, importSessionId)))
		.limit(1)
		.for('update');
	if (!session) throw notFound('Import session');
	return session;
}

async function sessionResults(
	executor: DatabaseExecutor,
	userId: string,
	importSessionId: string
): Promise<ImportResultRow[]> {
	return executor
		.select()
		.from(importResults)
		.where(
			and(eq(importResults.userId, userId), eq(importResults.importSessionId, importSessionId))
		)
		.orderBy(asc(importResults.createdAt), asc(importResults.candidateKey));
}

function publicResult(row: ImportResultRow) {
	return {
		candidateKey: row.candidateKey,
		itemId: row.itemId,
		originalUrl: row.originalUrl,
		displayUrl: maskSecrets(row.originalUrl),
		normalizedUrl: row.normalizedUrl,
		title: row.maskedSource,
		sourceDate: row.sourceDate,
		state: row.state,
		selected: row.selected,
		secretKinds: row.secretKinds,
		errorCode: row.errorCode
	};
}

async function loadSnapshot(executor: DatabaseExecutor, userId: string, importSessionId: string) {
	const session = await requireSession(executor, userId, importSessionId);
	const results = await sessionResults(executor, userId, importSessionId);
	const options = storedOptions(session.options);
	const progress = buildImportProgress(results, session.state);
	return {
		id: session.id,
		format: clientFormat(session.format),
		state: session.state,
		sourceType: options.sourceType,
		assignment: {
			collectionId: options.collectionId,
			tagIds: options.tagIds
		},
		progress: {
			...progress,
			duplicates: session.duplicateCount,
			ignored: session.ignoredCount
		},
		results: results.map(publicResult),
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		completedAt: session.completedAt
	};
}

function assertIdempotentPayload(session: ImportSession, requestHash: string): void {
	if (storedOptions(session.options).requestHash !== requestHash) {
		throw conflict('The idempotency key was already used for a different import payload', {
			idempotencyKey: session.idempotencyKey
		});
	}
}

function chunks<T>(values: readonly T[], size: number): T[][] {
	const groups: T[][] = [];
	for (let index = 0; index < values.length; index += size) {
		groups.push(values.slice(index, index + size));
	}
	return groups;
}

async function existingAccountUrls(
	executor: DatabaseExecutor,
	userId: string,
	normalizedUrls: readonly string[]
): Promise<Set<string>> {
	const existing = new Set<string>();
	for (const group of chunks([...new Set(normalizedUrls)], 500)) {
		if (group.length === 0) continue;
		const rows = await executor
			.selectDistinct({ normalizedUrl: linkTargets.normalizedUrl })
			.from(linkTargets)
			.innerJoin(links, and(eq(links.userId, userId), eq(links.targetId, linkTargets.id)))
			.where(and(eq(linkTargets.userId, userId), inArray(linkTargets.normalizedUrl, group)));
		for (const row of rows) existing.add(row.normalizedUrl);
	}
	return existing;
}

export async function createImportSession(userId: string, input: CreateImportInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = selectedImportPayload(parseInput(createImportSchema, input));
		if (parsed.candidates.length === 0) {
			throw new ServiceError(
				'validation_failed',
				'Choose at least one candidate before starting an import',
				400
			);
		}
		const requestHash = hashImportRequest(parsed);

		return db.transaction(async (tx) => {
			const replay = await findSessionByKey(tx, ownerId, parsed.idempotencyKey);
			if (replay) {
				assertIdempotentPayload(replay, requestHash);
				return {
					...(await loadSnapshot(tx, ownerId, replay.id)),
					idempotency: { replayed: true }
				};
			}

			const sourceType = parsed.sourceType ?? defaultSourceType(parsed.format);
			const collectionId = parsed.collectionId ?? null;
			const tagIds = parsed.tagIds ?? [];
			await validateRelations(tx, ownerId, collectionId, tagIds);

			const initial = planImportCandidates(parsed.candidates, new Set());
			const existing = await existingAccountUrls(
				tx,
				ownerId,
				initial.flatMap((candidate) => (candidate.normalizedUrl ? [candidate.normalizedUrl] : []))
			);
			const planned = planImportCandidates(parsed.candidates, existing);
			const duplicates = planned.filter(
				(candidate) =>
					candidate.state === 'duplicate_file' || candidate.state === 'duplicate_account'
			).length;
			const invalid = planned.filter((candidate) => candidate.state === 'invalid').length;
			const options: StoredImportOptions = {
				requestHash,
				sourceType,
				collectionId,
				tagIds,
				processedBatchKeys: [],
				processedRetryKeys: []
			};

			const [created] = await tx
				.insert(importSessions)
				.values({
					userId: ownerId,
					format: databaseImportFormat(parsed.format),
					state: 'reviewing',
					sourceLabel: sourceType,
					fileName: null,
					idempotencyKey: parsed.idempotencyKey,
					options: serializeOptions(options),
					totalCount: planned.length,
					validCount: planned.length - invalid,
					duplicateCount: duplicates,
					ignoredCount: parsed.ignoredCount,
					errorCount: invalid,
					importedCount: 0
				})
				.onConflictDoNothing({
					target: [importSessions.userId, importSessions.idempotencyKey]
				})
				.returning();

			if (!created) {
				const concurrent = await findSessionByKey(tx, ownerId, parsed.idempotencyKey);
				if (!concurrent) throw new Error('Import session disappeared after idempotency conflict');
				assertIdempotentPayload(concurrent, requestHash);
				return {
					...(await loadSnapshot(tx, ownerId, concurrent.id)),
					idempotency: { replayed: true }
				};
			}

			await tx.insert(importResults).values(
				planned.map((candidate) => ({
					userId: ownerId,
					importSessionId: created.id,
					candidateKey: candidate.candidateKey,
					originalUrl: candidate.originalUrl,
					normalizedUrl: candidate.normalizedUrl,
					maskedSource: candidate.maskedSource,
					sourceDate: candidate.sourceDate,
					state: candidate.state,
					selected: candidate.selected,
					secretKinds: candidate.secretKinds,
					errorCode: candidate.errorCode
				}))
			);

			return {
				...(await loadSnapshot(tx, ownerId, created.id)),
				idempotency: { replayed: false }
			};
		});
	});
}

export async function getImportSession(userId: string, importSessionId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(importIdSchema, importSessionId);
		return loadSnapshot(db, ownerId, id);
	});
}

function reviewStateRequired(state: ImportSessionState): void {
	if (state !== 'reviewing' && state !== 'failed') {
		throw conflict('This import can no longer be changed', { state });
	}
}

function invalidCandidateKeys(
	message: string,
	unknownKeys: readonly string[],
	ineligibleKeys: readonly string[]
): ServiceError {
	return new ServiceError('validation_failed', message, 400, {
		unknownCandidateKeys: unknownKeys,
		ineligibleCandidateKeys: ineligibleKeys
	});
}

export async function updateImportReview(
	userId: string,
	importSessionId: string,
	input: UpdateImportReviewInput
) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(importIdSchema, importSessionId);
		const parsed = parseInput(updateImportReviewSchema, input);

		return db.transaction(async (tx) => {
			const session = await lockSession(tx, ownerId, id);
			reviewStateRequired(session.state);
			const rows = await sessionResults(tx, ownerId, id);
			const options = storedOptions(session.options);

			if (parsed.selectedCandidateKeys !== undefined) {
				const selection = planReviewSelection(rows, parsed.selectedCandidateKeys);
				if (selection.unknownKeys.length > 0 || selection.ineligibleKeys.length > 0) {
					throw invalidCandidateKeys(
						'One or more candidates cannot be selected',
						selection.unknownKeys,
						selection.ineligibleKeys
					);
				}

				await tx
					.update(importResults)
					.set({ selected: false, updatedAt: new Date() })
					.where(
						and(
							eq(importResults.userId, ownerId),
							eq(importResults.importSessionId, id),
							inArray(importResults.state, [...ACTIVE_RESULT_STATES, 'failed'])
						)
					);
				if (selection.selectableKeys.length > 0) {
					await tx
						.update(importResults)
						.set({ selected: true, updatedAt: new Date() })
						.where(
							and(
								eq(importResults.userId, ownerId),
								eq(importResults.importSessionId, id),
								inArray(importResults.candidateKey, selection.selectableKeys)
							)
						);
				}
			}

			if (parsed.candidateTitles !== undefined) {
				const byKey = new Map(rows.map((row) => [row.candidateKey, row]));
				const unknown: string[] = [];
				const ineligible: string[] = [];
				for (const edit of parsed.candidateTitles) {
					const row = byKey.get(edit.candidateKey);
					if (!row) unknown.push(edit.candidateKey);
					else if (!ACTIVE_RESULT_STATES.includes(row.state) && row.state !== 'failed') {
						ineligible.push(edit.candidateKey);
					}
				}
				if (unknown.length > 0 || ineligible.length > 0) {
					throw invalidCandidateKeys(
						'One or more candidate titles cannot be changed',
						unknown,
						ineligible
					);
				}
				for (const edit of parsed.candidateTitles) {
					await tx
						.update(importResults)
						.set({
							maskedSource: edit.title ? maskSecrets(edit.title) : null,
							updatedAt: new Date()
						})
						.where(
							and(
								eq(importResults.userId, ownerId),
								eq(importResults.importSessionId, id),
								eq(importResults.candidateKey, edit.candidateKey)
							)
						);
				}
			}

			if (parsed.collectionId !== undefined) options.collectionId = parsed.collectionId;
			if (parsed.tagIds !== undefined) options.tagIds = parsed.tagIds;
			if (parsed.sourceType !== undefined) options.sourceType = parsed.sourceType;
			await validateRelations(tx, ownerId, options.collectionId, options.tagIds);
			await tx
				.update(importSessions)
				.set({
					options: serializeOptions(options),
					state: 'reviewing',
					completedAt: null,
					updatedAt: new Date()
				})
				.where(and(eq(importSessions.userId, ownerId), eq(importSessions.id, id)));

			return loadSnapshot(tx, ownerId, id);
		});
	});
}

async function createImportedLink(
	executor: DatabaseExecutor,
	userId: string,
	importSessionId: string,
	candidate: ImportResultRow,
	options: StoredImportOptions,
	allowDuplicate: boolean
): Promise<{ itemId: string; targetId: string }> {
	const normalized = normalizeServiceUrl(candidate.originalUrl);
	const target = await findOrCreateLinkTarget(
		executor,
		userId,
		normalized.normalizedUrl,
		normalized.domain
	);
	if (!allowDuplicate) {
		const existing = await findExistingLinkItem(executor, userId, target.id);
		if (existing) throw duplicateLink(existing);
	}

	const item = await insertBaseItem(executor, userId, {
		type: 'link',
		title: candidate.maskedSource,
		collectionId: options.collectionId,
		sourceDate: candidate.sourceDate
	});
	await insertLinkDetails(executor, userId, {
		itemId: item.id,
		targetId: target.id,
		originalUrl: normalized.originalUrl,
		importedTitle: candidate.maskedSource,
		sourceType: options.sourceType,
		sourceImportId: importSessionId
	});
	await replaceItemTags(executor, userId, item.id, options.tagIds);
	await refreshSearchDocuments(executor, userId, [item.id]);
	return { itemId: item.id, targetId: target.id };
}

export async function importNextBatch(
	userId: string,
	importSessionId: string,
	input: ImportBatchInput
) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(importIdSchema, importSessionId);
		const parsed = parseInput(importBatchSchema, input);
		const targetIdsToQueue: string[] = [];

		const snapshot = await db.transaction(async (tx) => {
			const session = await lockSession(tx, ownerId, id);
			const options = storedOptions(session.options);
			if (options.processedBatchKeys.includes(parsed.idempotencyKey)) {
				return {
					...(await loadSnapshot(tx, ownerId, id)),
					idempotency: { replayed: true }
				};
			}
			if (session.state === 'completed' || session.state === 'cancelled') {
				return {
					...(await loadSnapshot(tx, ownerId, id)),
					idempotency: { replayed: true }
				};
			}
			reviewStateRequired(session.state);
			await validateRelations(tx, ownerId, options.collectionId, options.tagIds);

			await tx
				.update(importSessions)
				.set({ state: 'importing', updatedAt: new Date() })
				.where(and(eq(importSessions.userId, ownerId), eq(importSessions.id, id)));

			const candidates = await tx
				.select()
				.from(importResults)
				.where(
					and(
						eq(importResults.userId, ownerId),
						eq(importResults.importSessionId, id),
						eq(importResults.selected, true),
						inArray(importResults.state, ACTIVE_RESULT_STATES)
					)
				)
				.orderBy(
					asc(sql`case ${importResults.state}
						when 'new' then 0
						when 'duplicate_file' then 1
						else 2
					end`),
					asc(importResults.createdAt),
					asc(importResults.candidateKey)
				)
				.limit(parsed.batchSize);

			for (const candidate of candidates) {
				const allowDuplicate = isDuplicateAllowed(
					candidate.state as ImportCandidateState,
					candidate.errorCode
				);
				try {
					const created = await tx.transaction((candidateTx) =>
						createImportedLink(candidateTx, ownerId, id, candidate, options, allowDuplicate)
					);
					targetIdsToQueue.push(created.targetId);
					await tx
						.update(importResults)
						.set({
							itemId: created.itemId,
							state: 'imported',
							errorCode: null,
							updatedAt: new Date()
						})
						.where(
							and(
								eq(importResults.userId, ownerId),
								eq(importResults.importSessionId, id),
								eq(importResults.id, candidate.id)
							)
						);
				} catch (error) {
					const serviceError = toServiceError(error);
					const becameDuplicate = serviceError.code === 'duplicate_link' && !allowDuplicate;
					await tx
						.update(importResults)
						.set({
							state: becameDuplicate ? 'duplicate_account' : 'failed',
							selected: becameDuplicate ? false : true,
							errorCode: becameDuplicate
								? 'duplicate_link'
								: allowDuplicate
									? 'import_failed_duplicate_allowed'
									: serviceError.code,
							updatedAt: new Date()
						})
						.where(
							and(
								eq(importResults.userId, ownerId),
								eq(importResults.importSessionId, id),
								eq(importResults.id, candidate.id)
							)
						);
				}
			}

			let rows = await sessionResults(tx, ownerId, id);
			let nextState = stateAfterBatch(rows);
			if (nextState === 'completed') {
				await tx
					.update(importResults)
					.set({ state: 'skipped', selected: false, updatedAt: new Date() })
					.where(
						and(
							eq(importResults.userId, ownerId),
							eq(importResults.importSessionId, id),
							eq(importResults.selected, false),
							inArray(importResults.state, ACTIVE_RESULT_STATES)
						)
					);
				rows = await sessionResults(tx, ownerId, id);
				nextState = 'completed';
			}

			const progress = buildImportProgress(rows, nextState);
			options.processedBatchKeys = appendOperationKey(
				options.processedBatchKeys,
				parsed.idempotencyKey
			);
			await tx
				.update(importSessions)
				.set({
					state: nextState,
					options: serializeOptions(options),
					totalCount: progress.total,
					validCount: progress.valid,
					errorCount: progress.invalid + progress.failed,
					importedCount: progress.imported,
					completedAt: nextState === 'completed' ? new Date() : null,
					updatedAt: new Date()
				})
				.where(and(eq(importSessions.userId, ownerId), eq(importSessions.id, id)));

			return {
				...(await loadSnapshot(tx, ownerId, id)),
				idempotency: { replayed: false }
			};
		});
		await enqueueOwnedMetadataBestEffort(ownerId, targetIdsToQueue);
		return snapshot;
	});
}

export async function cancelImport(userId: string, importSessionId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(importIdSchema, importSessionId);

		return db.transaction(async (tx) => {
			const session = await lockSession(tx, ownerId, id);
			if (session.state === 'cancelled' || session.state === 'completed') {
				return loadSnapshot(tx, ownerId, id);
			}

			await tx
				.update(importResults)
				.set({ state: 'skipped', selected: false, updatedAt: new Date() })
				.where(
					and(
						eq(importResults.userId, ownerId),
						eq(importResults.importSessionId, id),
						inArray(importResults.state, [...ACTIVE_RESULT_STATES, 'failed'])
					)
				);
			const rows = await sessionResults(tx, ownerId, id);
			const progress = buildImportProgress(rows, 'cancelled');
			await tx
				.update(importSessions)
				.set({
					state: 'cancelled',
					validCount: progress.valid,
					errorCount: progress.invalid,
					importedCount: progress.imported,
					completedAt: new Date(),
					updatedAt: new Date()
				})
				.where(and(eq(importSessions.userId, ownerId), eq(importSessions.id, id)));
			return loadSnapshot(tx, ownerId, id);
		});
	});
}

export async function retryImportCandidates(
	userId: string,
	importSessionId: string,
	input: RetryImportInput
) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(importIdSchema, importSessionId);
		const parsed = parseInput(retryImportSchema, input);

		return db.transaction(async (tx) => {
			const session = await lockSession(tx, ownerId, id);
			const options = storedOptions(session.options);
			if (options.processedRetryKeys.includes(parsed.idempotencyKey)) {
				return {
					...(await loadSnapshot(tx, ownerId, id)),
					idempotency: { replayed: true }
				};
			}
			reviewStateRequired(session.state);
			const rows = await sessionResults(tx, ownerId, id);
			const retry = planRetry(rows, parsed.candidateKeys);
			if (retry.unknownKeys.length > 0 || retry.notFailedKeys.length > 0) {
				throw invalidCandidateKeys(
					'Only failed candidates can be retried',
					retry.unknownKeys,
					retry.notFailedKeys
				);
			}

			const byKey = new Map(rows.map((row) => [row.candidateKey, row]));
			for (const candidateKey of retry.retryKeys) {
				const row = byKey.get(candidateKey);
				await tx
					.update(importResults)
					.set({
						state: 'new',
						selected: true,
						errorCode:
							row?.errorCode === 'import_failed_duplicate_allowed'
								? 'import_failed_duplicate_allowed'
								: null,
						updatedAt: new Date()
					})
					.where(
						and(
							eq(importResults.userId, ownerId),
							eq(importResults.importSessionId, id),
							eq(importResults.candidateKey, candidateKey),
							eq(importResults.state, 'failed')
						)
					);
			}

			options.processedRetryKeys = appendOperationKey(
				options.processedRetryKeys,
				parsed.idempotencyKey
			);
			const updatedRows = await sessionResults(tx, ownerId, id);
			const progress = buildImportProgress(updatedRows, 'reviewing');
			await tx
				.update(importSessions)
				.set({
					state: 'reviewing',
					options: serializeOptions(options),
					errorCount: progress.invalid + progress.failed,
					completedAt: null,
					updatedAt: new Date()
				})
				.where(and(eq(importSessions.userId, ownerId), eq(importSessions.id, id)));

			return {
				...(await loadSnapshot(tx, ownerId, id)),
				idempotency: { replayed: false }
			};
		});
	});
}
