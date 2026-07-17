import { createPastedBackup } from './backup';
import type {
	ExportBuildOptions,
	ExportCollection,
	ExportItem,
	ExportLinkItem,
	ExportSourceData,
	ExportTag,
	PastedBackupV1
} from './types';

interface LookupMaps {
	collections: Map<string, ExportCollection>;
	tags: Map<string, ExportTag>;
}

function lookups(backup: PastedBackupV1): LookupMaps {
	return {
		collections: new Map(backup.data.collections.map((collection) => [collection.id, collection])),
		tags: new Map(backup.data.tags.map((tag) => [tag.id, tag]))
	};
}

function collectionName(item: ExportItem, maps: LookupMaps): string {
	return item.collectionId
		? (maps.collections.get(item.collectionId)?.name ?? 'Unorganized')
		: 'Unorganized';
}

function tagNames(item: ExportItem, maps: LookupMaps): string[] {
	return item.tagIds.flatMap((tagId) => {
		const tag = maps.tags.get(tagId);
		return tag ? [tag.name] : [];
	});
}

function simpleItem(item: ExportItem, maps: LookupMaps): Record<string, unknown> {
	const result: Record<string, unknown> = {
		type: item.type,
		title: item.title,
		description: item.description,
		collection: collectionName(item, maps),
		tags: tagNames(item, maps),
		createdAt: item.createdAt,
		sourceDate: item.sourceDate,
		favorite: item.favorite,
		archived: item.archived,
		state: item.state
	};
	if (item.type === 'link') {
		result.url = item.link.originalUrl;
		result.domain = item.link.domain;
		result.content = item.link.personalNotes;
		result.metadata = item.link.metadata;
	} else if (item.type === 'note') {
		result.content = item.note.body;
	} else {
		result.content = item.reminder.description;
		result.dueAt = item.reminder.dueAt;
		result.reminderState = item.reminder.state;
		result.recurrence = item.reminder.recurrence;
		result.timeZone = item.reminder.timeZone;
	}
	return result;
}

export function serializeSimpleJson(
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): string {
	const backup = createPastedBackup(source, options);
	const maps = lookups(backup);
	return `${JSON.stringify(
		backup.data.items.map((item) => simpleItem(item, maps)),
		null,
		2
	)}\n`;
}

export function escapeCsvCell(value: unknown, protectFormulas = true): string {
	let text = value === null || value === undefined ? '' : String(value);
	if (protectFormulas && /^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_COLUMNS = [
	'type',
	'title',
	'url',
	'description',
	'collection',
	'tags',
	'createdAt',
	'sourceDate',
	'dueAt',
	'favorite',
	'archived',
	'state',
	'content'
] as const;

export function serializeCsv(source: ExportSourceData, options: ExportBuildOptions = {}): string {
	const backup = createPastedBackup(source, options);
	const maps = lookups(backup);
	const protectFormulas = options.protectCsvFormulas ?? true;
	const rows = [CSV_COLUMNS.join(',')];
	for (const item of backup.data.items) {
		const content =
			item.type === 'link'
				? item.link.personalNotes
				: item.type === 'note'
					? item.note.body
					: item.reminder.description;
		const row: Record<(typeof CSV_COLUMNS)[number], unknown> = {
			type: item.type,
			title: item.title,
			url: item.type === 'link' ? item.link.originalUrl : '',
			description: item.description,
			collection: collectionName(item, maps),
			tags: tagNames(item, maps).join(', '),
			createdAt: item.createdAt,
			sourceDate: item.sourceDate,
			dueAt: item.type === 'reminder' ? item.reminder.dueAt : '',
			favorite: item.favorite,
			archived: item.archived,
			state: item.type === 'reminder' ? item.reminder.state : item.state,
			content
		};
		rows.push(CSV_COLUMNS.map((column) => escapeCsvCell(row[column], protectFormulas)).join(','));
	}
	return `${rows.join('\r\n')}\r\n`;
}

function oneLine(value: string): string {
	return value
		.replace(/[\r\n\t]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function serializeTxt(source: ExportSourceData, options: ExportBuildOptions = {}): string {
	const backup = createPastedBackup(source, options);
	const includeTitles = options.includeTitlesInTxt ?? false;
	const lines = backup.data.items.flatMap((item) => {
		if (item.type !== 'link') return [];
		if (!includeTitles) return [item.link.originalUrl];
		const title = oneLine(item.title || item.link.metadata?.title || item.link.domain);
		return [`${title}\t${item.link.originalUrl}`];
	});
	return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function escapeMarkdownText(value: string): string {
	return oneLine(value).replace(/([\\`*_[\]<>])/g, '\\$1');
}

function markdownLink(item: ExportLinkItem): string {
	const title = escapeMarkdownText(item.title || item.link.metadata?.title || item.link.domain);
	const url = item.link.originalUrl.replace(/</g, '%3C').replace(/>/g, '%3E');
	return `- [${title}](<${url}>)`;
}

function markdownItem(item: ExportItem, maps: LookupMaps): string {
	const tags = tagNames(item, maps);
	const suffix =
		tags.length > 0 ? ` Tags: ${tags.map((tag) => `#${escapeMarkdownText(tag)}`).join(' ')}` : '';
	if (item.type === 'link') return `${markdownLink(item)}${suffix}`;
	if (item.type === 'note') {
		const title = escapeMarkdownText(item.title || 'Untitled note');
		return `### ${title}\n\n${item.note.body}${suffix ? `\n\n${suffix.trim()}` : ''}`;
	}
	const checked = item.reminder.state === 'completed' ? 'x' : ' ';
	const title = escapeMarkdownText(item.title || 'Untitled reminder');
	return `- [${checked}] **${title}**. Due: ${item.reminder.dueAt}.${suffix}`;
}

export function serializeMarkdown(
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): string {
	const backup = createPastedBackup(source, options);
	const maps = lookups(backup);
	const groups = new Map<string | null, ExportItem[]>();
	for (const item of backup.data.items) {
		const group = groups.get(item.collectionId) ?? [];
		group.push(item);
		groups.set(item.collectionId, group);
	}

	const sections = [`# Pasted export\n\nExported: ${backup.exportedAt}`];
	for (const collection of backup.data.collections) {
		const items = groups.get(collection.id) ?? [];
		if (items.length === 0) continue;
		sections.push(
			`## ${escapeMarkdownText(collection.name)}\n\n${items.map((item) => markdownItem(item, maps)).join('\n\n')}`
		);
	}
	const unorganized = groups.get(null) ?? [];
	if (unorganized.length > 0) {
		sections.push(
			`## Unorganized\n\n${unorganized.map((item) => markdownItem(item, maps)).join('\n\n')}`
		);
	}
	return `${sections.join('\n\n')}\n`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function bookmarkLine(item: ExportLinkItem, indent: string): string {
	const title = item.title || item.link.metadata?.title || item.link.domain;
	const addDate = Math.floor(Date.parse(item.createdAt) / 1000);
	return `${indent}<DT><A HREF="${escapeHtml(item.link.originalUrl)}" ADD_DATE="${addDate}">${escapeHtml(title)}</A>`;
}

export function serializeNetscapeBookmarks(
	source: ExportSourceData,
	options: ExportBuildOptions = {}
): string {
	const backup = createPastedBackup(source, options);
	const links = backup.data.items.filter((item): item is ExportLinkItem => item.type === 'link');
	const groups = new Map<string | null, ExportLinkItem[]>();
	for (const link of links) {
		const group = groups.get(link.collectionId) ?? [];
		group.push(link);
		groups.set(link.collectionId, group);
	}

	const lines = [
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>',
		'<!-- This file can be imported into common browsers. -->',
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		'<TITLE>Pasted bookmarks</TITLE>',
		'<H1>Pasted bookmarks</H1>',
		'<DL><p>'
	];
	for (const collection of backup.data.collections) {
		const collectionLinks = groups.get(collection.id) ?? [];
		if (collectionLinks.length === 0) continue;
		lines.push(`    <DT><H3>${escapeHtml(collection.name)}</H3>`, '    <DL><p>');
		for (const link of collectionLinks) lines.push(bookmarkLine(link, '        '));
		lines.push('    </DL><p>');
	}
	const unorganized = groups.get(null) ?? [];
	if (unorganized.length > 0) {
		lines.push('    <DT><H3>Unorganized</H3>', '    <DL><p>');
		for (const link of unorganized) lines.push(bookmarkLine(link, '        '));
		lines.push('    </DL><p>');
	}
	lines.push('</DL><p>');
	return `${lines.join('\n')}\n`;
}
