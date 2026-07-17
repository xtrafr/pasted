export type ImportFormat =
	'text' | 'whatsapp' | 'json' | 'csv' | 'markdown' | 'html' | 'netscape-bookmarks';

export interface ImportInput {
	content: string;
	filename?: string;
	mimeType?: string;
	format?: ImportFormat;
}

export interface ImportLimits {
	maxInputBytes: number;
	maxCandidates: number;
	maxUrlLength: number;
	maxExcerptLength: number;
	maxJsonDepth: number;
	maxJsonNodes: number;
	maxStringLength: number;
	maxCsvRows: number;
	maxCsvColumns: number;
}

export interface ParserContext {
	limits: ImportLimits;
	csvColumns?: readonly number[];
}

export interface RawImportCandidate {
	rawUrl: string;
	title?: string;
	sourceDate?: string;
	sourceLabel?: string;
	sourceExcerpt?: string;
	collectionPath?: string[];
}

export interface ParserWarning {
	code: string;
	message: string;
}

export interface RawParserResult {
	format: ImportFormat;
	candidates: RawImportCandidate[];
	ignoredCount: number;
	warnings: ParserWarning[];
}

export interface ImportParser {
	readonly format: ImportFormat;
	parse(input: ImportInput, context: ParserContext): RawParserResult;
}

export interface FormatDetection {
	format: ImportFormat;
	confidence: number;
	reasons: string[];
}

export type CandidateIssueCode =
	'dangerous-scheme' | 'unsupported-scheme' | 'invalid-url' | 'url-too-long';

export interface CandidateIssue {
	code: CandidateIssueCode;
	message: string;
}

export type SecretKind =
	'credentials' | 'sensitive-query' | 'api-key' | 'access-token' | 'jwt' | 'webhook';

export interface SecretFinding {
	kind: SecretKind;
	label: string;
	maskedPreview: string;
}

export interface DuplicateMatch {
	kind: 'within-import' | 'existing';
	firstCandidateId?: string;
}

export interface ImportCandidate {
	id: string;
	originalUrl: string;
	displayUrl: string;
	normalizedUrl?: string;
	domain?: string;
	title?: string;
	sourceDate?: string;
	sourceLabel?: string;
	sourceExcerpt?: string;
	collectionPath?: string[];
	valid: boolean;
	issues: CandidateIssue[];
	secretFindings: SecretFinding[];
	duplicate?: DuplicateMatch;
}

export interface ImportSummary {
	found: number;
	valid: number;
	invalid: number;
	duplicates: number;
	ignored: number;
	withSecrets: number;
}

export interface ImportResult {
	format: ImportFormat;
	detection: FormatDetection;
	candidates: ImportCandidate[];
	summary: ImportSummary;
	warnings: ParserWarning[];
}

export interface ParseImportOptions {
	format?: ImportFormat;
	limits?: Partial<ImportLimits>;
	existingNormalizedUrls?: Iterable<string>;
	removeTrackingParameters?: boolean;
	csvColumns?: readonly number[];
}

export interface ExtractedUrl {
	value: string;
	start: number;
	end: number;
	kind: 'http' | 'bare' | 'dangerous';
}
