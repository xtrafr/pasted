import type {
	ExportItem,
	ExportPrivacyInput,
	ExportSourceData,
	ResolvedExportPrivacy
} from './types';

export const DEFAULT_EXPORT_PRIVACY: Readonly<ResolvedExportPrivacy> = Object.freeze({
	includePersonalNotes: true,
	includeSourceDates: true,
	includeLinkMetadata: true,
	includeNoteBodies: true,
	includeReminderDescriptions: true
});

export function resolveExportPrivacy(input: ExportPrivacyInput = {}): ResolvedExportPrivacy {
	return { ...DEFAULT_EXPORT_PRIVACY, ...input };
}

function applyItemPrivacy(item: ExportItem, privacy: ResolvedExportPrivacy): ExportItem {
	const common = {
		...item,
		tagIds: [...item.tagIds],
		sourceDate: privacy.includeSourceDates ? item.sourceDate : null
	};

	if (item.type === 'link') {
		return {
			...common,
			type: 'link',
			link: {
				...item.link,
				personalNotes: privacy.includePersonalNotes ? item.link.personalNotes : null,
				metadata:
					privacy.includeLinkMetadata && item.link.metadata ? { ...item.link.metadata } : null
			}
		};
	}
	if (item.type === 'note') {
		return {
			...common,
			type: 'note',
			note: { body: privacy.includeNoteBodies ? item.note.body : '' }
		};
	}
	return {
		...common,
		type: 'reminder',
		reminder: {
			...item.reminder,
			description: privacy.includeReminderDescriptions ? item.reminder.description : null
		}
	};
}

export function applyExportPrivacy(
	data: ExportSourceData,
	input: ExportPrivacyInput = {}
): { data: ExportSourceData; privacy: ResolvedExportPrivacy } {
	const privacy = resolveExportPrivacy(input);
	return {
		data: {
			collections: data.collections.map((collection) => ({ ...collection })),
			tags: data.tags.map((tag) => ({ ...tag })),
			items: data.items.map((item) => applyItemPrivacy(item, privacy))
		},
		privacy
	};
}
