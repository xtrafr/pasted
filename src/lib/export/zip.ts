import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { serializePastedJson } from './backup';
import type { ExportBuildOptions, ExportSourceData, PastedBackupV1 } from './types';
import {
	BackupValidationError,
	DEFAULT_BACKUP_RESTORE_LIMITS,
	parsePastedBackupJson,
	type BackupRestoreLimits
} from './validation';

export const BACKUP_JSON_FILENAME = 'pasted-backup.json';
export const BACKUP_README_FILENAME = 'README.txt';

function createReadme(backupJson: string): string {
	const backup = parsePastedBackupJson(backupJson);
	return [
		'Pasted backup',
		'',
		`Format version: ${backup.version}`,
		`Exported: ${backup.exportedAt}`,
		`Items: ${backup.manifest.itemCount}`,
		'',
		`Restore the file named ${BACKUP_JSON_FILENAME} from Pasted's import or restore screen.`,
		'Do not edit IDs or manifest counts if you want the backup to remain restorable.',
		''
	].join('\n');
}

export function createBackupZip(
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): Uint8Array {
	const backupJson = serializePastedJson(source, options);
	return zipSync(
		{
			[BACKUP_JSON_FILENAME]: strToU8(backupJson),
			[BACKUP_README_FILENAME]: strToU8(createReadme(backupJson))
		},
		{ level: 6 }
	);
}

function zipIssue(message: string, cause?: unknown): BackupValidationError {
	return new BackupValidationError(
		[{ path: '$', message }],
		cause === undefined ? undefined : { cause }
	);
}

export function parsePastedBackupZip(
	bytes: Uint8Array,
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): PastedBackupV1 {
	if (bytes.byteLength > limits.maxZipBytes) {
		throw zipIssue(`Backup ZIP exceeds the ${limits.maxZipBytes} byte limit`);
	}

	let totalUncompressedBytes = 0;
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(bytes, {
			filter(file) {
				const accepted = file.name === BACKUP_JSON_FILENAME || file.name === BACKUP_README_FILENAME;
				if (!accepted) return false;
				totalUncompressedBytes += file.originalSize;
				if (totalUncompressedBytes > limits.maxUncompressedBytes) {
					throw zipIssue(
						`Backup ZIP exceeds the ${limits.maxUncompressedBytes} uncompressed byte limit`
					);
				}
				return true;
			}
		});
	} catch (error) {
		if (error instanceof BackupValidationError) throw error;
		throw zipIssue('Backup is not a valid ZIP archive', error);
	}

	const backupBytes = files[BACKUP_JSON_FILENAME];
	if (!backupBytes) throw zipIssue(`Backup ZIP does not contain ${BACKUP_JSON_FILENAME}`);
	if (backupBytes.byteLength > limits.maxUncompressedBytes) {
		throw zipIssue(
			`Backup JSON exceeds the ${limits.maxUncompressedBytes} uncompressed byte limit`
		);
	}

	return parsePastedBackupJson(strFromU8(backupBytes), limits);
}
