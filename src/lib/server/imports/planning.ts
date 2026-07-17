import { createHash } from 'node:crypto';
import { detectSecrets, maskSecrets } from '$lib/import/secrets';
import { normalizeUrl } from '$lib/import/urls';
import type { SecretKind } from '$lib/import/types';
import type { ParsedCreateImport } from './validation';

export type ImportCandidateState =
	'new' | 'duplicate_file' | 'duplicate_account' | 'invalid' | 'imported' | 'failed' | 'skipped';

export type ImportSessionState =
	'analyzing' | 'reviewing' | 'importing' | 'completed' | 'cancelled' | 'failed';

export interface PlannedImportCandidate {
	candidateKey: string;
	originalUrl: string;
	normalizedUrl: string | null;
	maskedSource: string | null;
	sourceDate: Date | null;
	state: ImportCandidateState;
	selected: boolean;
	secretKinds: SecretKind[];
	errorCode: string | null;
}

export interface ImportResultLike {
	candidateKey: string;
	state: ImportCandidateState;
	selected: boolean;
}

export interface ImportProgress {
	total: number;
	valid: number;
	duplicates: number;
	invalid: number;
	selected: number;
	pending: number;
	imported: number;
	failed: number;
	skipped: number;
	processed: number;
	percent: number;
}

const ELIGIBLE_STATES = new Set<ImportCandidateState>([
	'new',
	'duplicate_file',
	'duplicate_account'
]);

function uniqueSecretKinds(...groups: ReadonlyArray<ReadonlyArray<SecretKind>>): SecretKind[] {
	return [...new Set(groups.flat())];
}

function sourceDate(value: string | undefined): Date | null {
	if (!value) return null;
	const hasZone = /(?:z|[+-]\d{2}:\d{2})$/i.test(value);
	return new Date(hasZone ? value : `${value}Z`);
}

function invalidPlan(
	candidate: ParsedCreateImport['candidates'][number],
	errorCode: string
): PlannedImportCandidate {
	const title = candidate.title ? maskSecrets(candidate.title) : null;
	return {
		candidateKey: candidate.id,
		originalUrl: candidate.originalUrl,
		normalizedUrl: null,
		maskedSource: title,
		sourceDate: sourceDate(candidate.sourceDate),
		state: 'invalid',
		selected: false,
		secretKinds: uniqueSecretKinds(
			candidate.secretKinds ?? [],
			detectSecrets(candidate.originalUrl).map((finding) => finding.kind),
			candidate.title ? detectSecrets(candidate.title).map((finding) => finding.kind) : []
		),
		errorCode
	};
}

export function planImportCandidates(
	candidates: ParsedCreateImport['candidates'],
	existingNormalizedUrls: ReadonlySet<string>
): PlannedImportCandidate[] {
	const firstCandidateByUrl = new Map<string, string>();

	return candidates.map((candidate) => {
		const normalized = normalizeUrl(candidate.originalUrl, { maxUrlLength: 8_192 });
		if (!normalized.normalizedUrl || normalized.issues.length > 0) {
			return invalidPlan(candidate, normalized.issues[0]?.code ?? 'invalid_url');
		}

		const parsedUrl = new URL(normalized.normalizedUrl);
		if (parsedUrl.username || parsedUrl.password) {
			return invalidPlan(candidate, 'credentials_not_allowed');
		}

		let state: ImportCandidateState = 'new';
		if (existingNormalizedUrls.has(normalized.normalizedUrl)) {
			state = 'duplicate_account';
		} else if (firstCandidateByUrl.has(normalized.normalizedUrl)) {
			state = 'duplicate_file';
		} else {
			firstCandidateByUrl.set(normalized.normalizedUrl, candidate.id);
		}

		const selected = candidate.selected === undefined ? state === 'new' : candidate.selected;
		const title = candidate.title ? maskSecrets(candidate.title) : null;

		return {
			candidateKey: candidate.id,
			originalUrl: normalized.inputUrl,
			normalizedUrl: normalized.normalizedUrl,
			maskedSource: title,
			sourceDate: sourceDate(candidate.sourceDate),
			state,
			selected,
			secretKinds: uniqueSecretKinds(
				candidate.secretKinds ?? [],
				detectSecrets(normalized.inputUrl).map((finding) => finding.kind),
				candidate.title ? detectSecrets(candidate.title).map((finding) => finding.kind) : []
			),
			errorCode: null
		};
	});
}

export function buildImportProgress(
	results: readonly ImportResultLike[],
	sessionState: ImportSessionState
): ImportProgress {
	const duplicates = results.filter(
		(result) => result.state === 'duplicate_file' || result.state === 'duplicate_account'
	).length;
	const invalid = results.filter((result) => result.state === 'invalid').length;
	const selected = results.filter((result) => result.selected).length;
	const pending = results.filter(
		(result) => result.selected && ELIGIBLE_STATES.has(result.state)
	).length;
	const imported = results.filter((result) => result.state === 'imported').length;
	const failed = results.filter((result) => result.state === 'failed').length;
	const skipped = results.filter((result) => result.state === 'skipped').length;
	const processed = imported + failed;
	const percent =
		sessionState === 'completed' || sessionState === 'cancelled'
			? 100
			: selected === 0
				? 0
				: Math.min(100, Math.round((processed / selected) * 100));

	return {
		total: results.length,
		valid: results.length - invalid,
		duplicates,
		invalid,
		selected,
		pending,
		imported,
		failed,
		skipped,
		processed,
		percent
	};
}

export interface ReviewSelectionPlan {
	selectableKeys: string[];
	unknownKeys: string[];
	ineligibleKeys: string[];
}

export function planReviewSelection(
	results: readonly ImportResultLike[],
	requestedKeys: readonly string[]
): ReviewSelectionPlan {
	const byKey = new Map(results.map((result) => [result.candidateKey, result]));
	const selectableKeys: string[] = [];
	const unknownKeys: string[] = [];
	const ineligibleKeys: string[] = [];

	for (const key of requestedKeys) {
		const result = byKey.get(key);
		if (!result) unknownKeys.push(key);
		else if (ELIGIBLE_STATES.has(result.state) || result.state === 'failed') {
			selectableKeys.push(key);
		} else if (result.state !== 'imported') {
			ineligibleKeys.push(key);
		}
	}

	return { selectableKeys, unknownKeys, ineligibleKeys };
}

export interface RetryPlan {
	retryKeys: string[];
	unknownKeys: string[];
	notFailedKeys: string[];
}

export function planRetry(
	results: readonly ImportResultLike[],
	requestedKeys?: readonly string[]
): RetryPlan {
	const byKey = new Map(results.map((result) => [result.candidateKey, result]));
	const requested =
		requestedKeys ??
		results.filter((result) => result.state === 'failed').map((result) => result.candidateKey);
	const retryKeys: string[] = [];
	const unknownKeys: string[] = [];
	const notFailedKeys: string[] = [];

	for (const key of requested) {
		const result = byKey.get(key);
		if (!result) unknownKeys.push(key);
		else if (result.state === 'failed') retryKeys.push(key);
		else notFailedKeys.push(key);
	}

	return { retryKeys, unknownKeys, notFailedKeys };
}

export function stateAfterBatch(results: readonly ImportResultLike[]): ImportSessionState {
	if (results.some((result) => result.selected && ELIGIBLE_STATES.has(result.state))) {
		return 'reviewing';
	}
	if (results.some((result) => result.selected && result.state === 'failed')) return 'failed';
	return 'completed';
}

export function hashImportRequest(input: ParsedCreateImport): string {
	const canonical = {
		format: input.format,
		sourceType: input.sourceType ?? null,
		collectionId: input.collectionId ?? null,
		tagIds: [...(input.tagIds ?? [])].sort(),
		ignoredCount: input.ignoredCount,
		candidates: input.candidates
			.map((candidate) => ({
				id: candidate.id,
				originalUrl: candidate.originalUrl,
				title: candidate.title ?? null,
				sourceDate: candidate.sourceDate ?? null,
				selected: candidate.selected ?? null,
				secretKinds: [...(candidate.secretKinds ?? [])].sort()
			}))
			.sort((left, right) => left.id.localeCompare(right.id))
	};

	return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function isDuplicateAllowed(state: ImportCandidateState, errorCode: string | null): boolean {
	return (
		state === 'duplicate_file' ||
		state === 'duplicate_account' ||
		errorCode === 'import_failed_duplicate_allowed'
	);
}
