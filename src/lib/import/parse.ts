import { detectImportFormat } from './detect';
import { assertInputSize, resolveImportLimits } from './limits';
import { getImportParser } from './registry';
import { detectSecrets, maskSecrets } from './secrets';
import { normalizeUrl } from './urls';
import { truncateText } from './unicode';
import type {
	ImportCandidate,
	ImportInput,
	ImportResult,
	ParseImportOptions,
	SecretFinding
} from './types';

function mergeSecretFindings(...groups: SecretFinding[][]): SecretFinding[] {
	const merged: SecretFinding[] = [];
	const seen = new Set<string>();
	for (const group of groups) {
		for (const finding of group) {
			const key = `${finding.kind}:${finding.label}`;
			if (!seen.has(key)) {
				seen.add(key);
				merged.push(finding);
			}
		}
	}
	return merged;
}

export function parseImport(input: ImportInput, options: ParseImportOptions = {}): ImportResult {
	const limits = resolveImportLimits(options.limits);
	assertInputSize(input.content, limits);
	const detection = detectImportFormat(input, options.format);
	const parser = getImportParser(detection.format);
	const rawResult = parser.parse(input, {
		limits,
		...(options.csvColumns ? { csvColumns: [...new Set(options.csvColumns)] } : {})
	});
	const removeTracking = options.removeTrackingParameters ?? true;

	const existing = new Set<string>();
	for (const value of options.existingNormalizedUrls ?? []) {
		const normalized = normalizeUrl(value, limits, removeTracking);
		if (normalized.normalizedUrl) existing.add(normalized.normalizedUrl);
	}

	const firstCandidateByUrl = new Map<string, string>();
	const candidates: ImportCandidate[] = rawResult.candidates.map((raw, index) => {
		const id = `candidate-${index + 1}`;
		const normalized = normalizeUrl(raw.rawUrl, limits, removeTracking);
		const sourceExcerpt = raw.sourceExcerpt
			? maskSecrets(truncateText(raw.sourceExcerpt, limits.maxExcerptLength))
			: undefined;
		const secretFindings = mergeSecretFindings(
			detectSecrets(normalized.inputUrl),
			raw.sourceExcerpt ? detectSecrets(raw.sourceExcerpt) : []
		);
		const candidate: ImportCandidate = {
			id,
			originalUrl: normalized.inputUrl,
			displayUrl: maskSecrets(normalized.inputUrl),
			...(normalized.normalizedUrl ? { normalizedUrl: normalized.normalizedUrl } : {}),
			...(normalized.domain ? { domain: normalized.domain } : {}),
			...(raw.title ? { title: maskSecrets(raw.title) } : {}),
			...(raw.sourceDate ? { sourceDate: raw.sourceDate } : {}),
			...(raw.sourceLabel ? { sourceLabel: raw.sourceLabel } : {}),
			...(sourceExcerpt ? { sourceExcerpt } : {}),
			...(raw.collectionPath ? { collectionPath: raw.collectionPath } : {}),
			valid: normalized.issues.length === 0,
			issues: normalized.issues,
			secretFindings
		};

		if (candidate.normalizedUrl) {
			if (existing.has(candidate.normalizedUrl)) {
				candidate.duplicate = { kind: 'existing' };
			} else {
				const firstCandidateId = firstCandidateByUrl.get(candidate.normalizedUrl);
				if (firstCandidateId) {
					candidate.duplicate = { kind: 'within-import', firstCandidateId };
				} else {
					firstCandidateByUrl.set(candidate.normalizedUrl, id);
				}
			}
		}

		return candidate;
	});

	return {
		format: detection.format,
		detection,
		candidates,
		summary: {
			found: candidates.length,
			valid: candidates.filter((candidate) => candidate.valid).length,
			invalid: candidates.filter((candidate) => !candidate.valid).length,
			duplicates: candidates.filter((candidate) => candidate.duplicate).length,
			ignored: rawResult.ignoredCount,
			withSecrets: candidates.filter((candidate) => candidate.secretFindings.length > 0).length
		},
		warnings: rawResult.warnings
	};
}
