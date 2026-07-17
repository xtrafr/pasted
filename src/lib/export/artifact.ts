import { createPastedBackup, serializePastedJson } from './backup';
import {
	serializeCsv,
	serializeMarkdown,
	serializeNetscapeBookmarks,
	serializeSimpleJson,
	serializeTxt
} from './serializers';
import type { ExportArtifact, ExportBuildOptions, ExportFormat, ExportSourceData } from './types';
import { createBackupZip } from './zip';

const FORMAT_DETAILS: Record<ExportFormat, { extension: string; mimeType: string }> = {
	'pasted-json': { extension: '.pasted.json', mimeType: 'application/json' },
	'simple-json': { extension: '.json', mimeType: 'application/json' },
	csv: { extension: '.csv', mimeType: 'text/csv;charset=utf-8' },
	txt: { extension: '.txt', mimeType: 'text/plain;charset=utf-8' },
	markdown: { extension: '.md', mimeType: 'text/markdown;charset=utf-8' },
	'netscape-bookmarks': { extension: '.html', mimeType: 'text/html;charset=utf-8' },
	zip: { extension: '.zip', mimeType: 'application/zip' }
};

function safeFilenameBase(value: string): string {
	const normalized = value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[._-]+|[._-]+$/g, '')
		.slice(0, 80);
	return normalized || 'pasted-export';
}

function byteLength(data: string | Uint8Array): number {
	return typeof data === 'string' ? new TextEncoder().encode(data).byteLength : data.byteLength;
}

function serialize(
	format: ExportFormat,
	source: ExportSourceData,
	options: ExportBuildOptions
): string | Uint8Array {
	switch (format) {
		case 'pasted-json':
			return serializePastedJson(source, options);
		case 'simple-json':
			return serializeSimpleJson(source, options);
		case 'csv':
			return serializeCsv(source, options);
		case 'txt':
			return serializeTxt(source, options);
		case 'markdown':
			return serializeMarkdown(source, options);
		case 'netscape-bookmarks':
			return serializeNetscapeBookmarks(source, options);
		case 'zip':
			return createBackupZip(source, options);
	}
}

export function createExportArtifact(
	format: ExportFormat,
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): ExportArtifact {
	const exportedAt = options.exportedAt ?? new Date().toISOString();
	const resolvedOptions: ExportBuildOptions = { ...options, exportedAt };
	const data = serialize(format, source, resolvedOptions);
	const details = FORMAT_DETAILS[format];
	const filenameBase = safeFilenameBase(options.filenameBase ?? 'pasted-export');
	const date = exportedAt.slice(0, 10);
	return {
		format,
		filename: `${filenameBase}-${date}${details.extension}`,
		mimeType: details.mimeType,
		data,
		sizeBytes: byteLength(data),
		itemCount: createPastedBackup(source, resolvedOptions).manifest.itemCount
	};
}

export function estimateExportSize(
	format: ExportFormat,
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): number {
	return createExportArtifact(format, source, options).sizeBytes;
}
