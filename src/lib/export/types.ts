export const PASTED_BACKUP_FORMAT = 'pasted-backup' as const;
export const PASTED_BACKUP_VERSION = 1 as const;

export type ExportItemType = 'link' | 'note' | 'reminder';
export type ExportItemState = 'active' | 'read' | 'broken';
export type ExportReminderState = 'pending' | 'completed';
export type ExportCollectionSort = 'manual' | 'created_at' | 'title';
export type ExportMetadataState = 'pending' | 'fetching' | 'ready' | 'failed' | 'blocked';

export interface ExportCollection {
	id: string;
	name: string;
	description: string | null;
	color: string | null;
	icon: string | null;
	sortOrder: number;
	sortMode: ExportCollectionSort;
	createdAt: string;
	updatedAt: string;
}

export interface ExportTag {
	id: string;
	name: string;
	color: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ExportLinkMetadata {
	title: string | null;
	description: string | null;
	siteName: string | null;
	state: ExportMetadataState;
	errorCode: string | null;
	httpStatus: number | null;
	lastFetchedAt: string | null;
}

export interface ExportItemBase {
	id: string;
	title: string | null;
	description: string | null;
	collectionId: string | null;
	tagIds: string[];
	state: ExportItemState;
	favorite: boolean;
	archived: boolean;
	sortOrder: number;
	sourceDate: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ExportLinkItem extends ExportItemBase {
	type: 'link';
	link: {
		originalUrl: string;
		normalizedUrl: string;
		domain: string;
		personalNotes: string | null;
		importedTitle: string | null;
		sourceType: string | null;
		metadata: ExportLinkMetadata | null;
	};
}

export interface ExportNoteItem extends ExportItemBase {
	type: 'note';
	note: {
		body: string;
	};
}

export interface ExportReminderItem extends ExportItemBase {
	type: 'reminder';
	reminder: {
		description: string | null;
		dueAt: string;
		state: ExportReminderState;
		recurrence: string | null;
		timeZone: string;
		completedAt: string | null;
		lastNotifiedAt: string | null;
	};
}

export type ExportItem = ExportLinkItem | ExportNoteItem | ExportReminderItem;

export interface ExportSourceData {
	collections: ExportCollection[];
	tags: ExportTag[];
	items: ExportItem[];
}

export type ExportSelectionInput =
	| { kind: 'all' }
	| { kind: 'manual'; itemIds: readonly string[] }
	| { kind: 'search'; itemIds: readonly string[]; query?: string };

export interface ExportFilterInput {
	collectionIds?: readonly (string | null)[];
	tagIds?: readonly string[];
	tagMatch?: 'any' | 'all';
	types?: readonly ExportItemType[];
	domains?: readonly string[];
	favorite?: boolean;
	archived?: boolean;
	createdFrom?: string;
	createdTo?: string;
	reminderStates?: readonly ExportReminderState[];
}

export interface ResolvedExportSelection {
	kind: 'all' | 'manual' | 'search';
	itemIds: string[];
	query: string | null;
}

export interface ResolvedExportFilters {
	collectionIds: (string | null)[];
	tagIds: string[];
	tagMatch: 'any' | 'all';
	types: ExportItemType[];
	domains: string[];
	favorite: boolean | null;
	archived: boolean | null;
	createdFrom: string | null;
	createdTo: string | null;
	reminderStates: ExportReminderState[];
}

export interface ExportPrivacyInput {
	includePersonalNotes?: boolean;
	includeSourceDates?: boolean;
	includeLinkMetadata?: boolean;
	includeNoteBodies?: boolean;
	includeReminderDescriptions?: boolean;
}

export interface ResolvedExportPrivacy {
	includePersonalNotes: boolean;
	includeSourceDates: boolean;
	includeLinkMetadata: boolean;
	includeNoteBodies: boolean;
	includeReminderDescriptions: boolean;
}

export interface ExportBuildOptions {
	selection?: ExportSelectionInput;
	filters?: ExportFilterInput;
	privacy?: ExportPrivacyInput;
	exportedAt?: string;
	generatorVersion?: string;
	filenameBase?: string;
	includeTitlesInTxt?: boolean;
	protectCsvFormulas?: boolean;
}

export interface PastedBackupManifestV1 {
	itemCount: number;
	collectionCount: number;
	tagCount: number;
	selection: ResolvedExportSelection;
	filters: ResolvedExportFilters;
	privacy: ResolvedExportPrivacy;
}

export interface PastedBackupV1 {
	format: typeof PASTED_BACKUP_FORMAT;
	version: typeof PASTED_BACKUP_VERSION;
	exportedAt: string;
	generator: {
		name: 'Pasted';
		version: string | null;
	};
	manifest: PastedBackupManifestV1;
	data: ExportSourceData;
}

export type ExportFormat =
	'pasted-json' | 'simple-json' | 'csv' | 'txt' | 'markdown' | 'netscape-bookmarks' | 'zip';

export interface ExportArtifact {
	format: ExportFormat;
	filename: string;
	mimeType: string;
	data: string | Uint8Array;
	sizeBytes: number;
	itemCount: number;
}

export interface BackupValidationIssue {
	path: string;
	message: string;
}
