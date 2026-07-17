import { applyExportPrivacy } from './privacy';
import { selectExportData } from './selection';
import {
	PASTED_BACKUP_FORMAT,
	PASTED_BACKUP_VERSION,
	type ExportBuildOptions,
	type ExportSourceData,
	type PastedBackupV1
} from './types';
import {
	assertPastedBackupJsonSize,
	DEFAULT_BACKUP_RESTORE_LIMITS,
	type BackupRestoreLimits,
	validatePastedBackup
} from './validation';

export function createPastedBackup(
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): PastedBackupV1 {
	const selected = selectExportData(source, options.selection, options.filters);
	const privateData = applyExportPrivacy(selected.data, options.privacy);
	const backup: PastedBackupV1 = {
		format: PASTED_BACKUP_FORMAT,
		version: PASTED_BACKUP_VERSION,
		exportedAt: options.exportedAt ?? new Date().toISOString(),
		generator: {
			name: 'Pasted',
			version: options.generatorVersion ?? null
		},
		manifest: {
			itemCount: privateData.data.items.length,
			collectionCount: privateData.data.collections.length,
			tagCount: privateData.data.tags.length,
			selection: selected.selection,
			filters: selected.filters,
			privacy: privateData.privacy
		},
		data: privateData.data
	};
	return validatePastedBackup(backup);
}

export function serializePastedJson(
	source: ExportSourceData,
	options: ExportBuildOptions = {},
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): string {
	const json = `${JSON.stringify(createPastedBackup(source, options), null, 2)}\n`;
	assertPastedBackupJsonSize(json, limits);
	return json;
}
