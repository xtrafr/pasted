import { z } from 'zod';
import {
	cursorSchema,
	dateInputSchema,
	descriptionSchema,
	idSchema,
	itemIdsSchema,
	nonEmptyTagIdsSchema,
	notesBodySchema,
	nullableCollectionIdSchema,
	nullableDateInputSchema,
	tagIdsSchema,
	timeZoneSchema,
	titleSchema
} from './common';

const commonCreateShape = {
	collectionId: nullableCollectionIdSchema.optional(),
	tagIds: tagIdsSchema.optional(),
	favorite: z.boolean().optional(),
	archived: z.boolean().optional(),
	sourceDate: dateInputSchema.optional()
};

const commonUpdateShape = {
	title: titleSchema.nullable().optional(),
	description: descriptionSchema.nullable().optional(),
	collectionId: nullableCollectionIdSchema.optional(),
	tagIds: tagIdsSchema.optional(),
	favorite: z.boolean().optional(),
	archived: z.boolean().optional(),
	state: z.enum(['active', 'read', 'broken']).optional(),
	sourceDate: nullableDateInputSchema
};

export const createLinkSchema = z
	.object({
		...commonCreateShape,
		originalUrl: z.string().trim().min(1).max(8_192),
		title: titleSchema.nullable().optional(),
		description: descriptionSchema.nullable().optional(),
		personalNotes: z.string().trim().max(20_000).nullable().optional(),
		importedTitle: titleSchema.nullable().optional(),
		sourceType: z.string().trim().min(1).max(100).nullable().optional(),
		sourceImportId: idSchema.nullable().optional(),
		allowDuplicate: z.boolean().default(false)
	})
	.strict();

export const updateLinkSchema = z
	.object({
		...commonUpdateShape,
		originalUrl: z.string().trim().min(1).max(8_192).optional(),
		personalNotes: z.string().trim().max(20_000).nullable().optional(),
		importedTitle: titleSchema.nullable().optional(),
		sourceType: z.string().trim().min(1).max(100).nullable().optional(),
		sourceImportId: idSchema.nullable().optional(),
		allowDuplicate: z.boolean().default(false)
	})
	.strict()
	.superRefine((value, context) => {
		const hasUpdate = Object.entries(value).some(
			([key, fieldValue]) => key !== 'allowDuplicate' && fieldValue !== undefined
		);
		if (!hasUpdate) {
			context.addIssue({ code: 'custom', message: 'At least one link field must be provided' });
		}
		if (value.allowDuplicate && value.originalUrl === undefined) {
			context.addIssue({
				code: 'custom',
				path: ['allowDuplicate'],
				message: 'allowDuplicate can only be used when changing the URL'
			});
		}
	});

export const createNoteSchema = z
	.object({
		...commonCreateShape,
		title: titleSchema.nullable().optional(),
		body: notesBodySchema
	})
	.strict();

export const updateNoteSchema = z
	.object({
		...commonUpdateShape,
		body: notesBodySchema.optional()
	})
	.strict()
	.refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
		message: 'At least one note field must be provided'
	});

export const createReminderSchema = z
	.object({
		...commonCreateShape,
		title: titleSchema,
		description: descriptionSchema.nullable().optional(),
		dueAt: dateInputSchema,
		recurrence: z.string().trim().min(1).max(500).nullable().optional(),
		timeZone: timeZoneSchema.default('UTC')
	})
	.strict();

export const updateReminderSchema = z
	.object({
		...commonUpdateShape,
		title: titleSchema.optional(),
		dueAt: dateInputSchema.optional(),
		reminderState: z.enum(['pending', 'completed']).optional(),
		recurrence: z.string().trim().min(1).max(500).nullable().optional(),
		timeZone: timeZoneSchema.optional()
	})
	.strict()
	.refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
		message: 'At least one reminder field must be provided'
	});

export const listItemsSchema = z
	.object({
		query: z.string().trim().max(300).optional(),
		types: z
			.array(z.enum(['link', 'note', 'reminder']))
			.max(3)
			.optional(),
		states: z
			.array(z.enum(['active', 'read', 'broken']))
			.max(3)
			.optional(),
		reminderStates: z
			.array(z.enum(['pending', 'completed']))
			.max(2)
			.optional(),
		collectionId: nullableCollectionIdSchema.optional(),
		tagIds: tagIdsSchema.optional(),
		tagMode: z.enum(['any', 'all']).default('all'),
		domains: z.array(z.string().trim().min(1).max(253).toLowerCase()).max(50).optional(),
		favorite: z.boolean().optional(),
		archived: z.boolean().default(false),
		createdFrom: dateInputSchema.optional(),
		createdTo: dateInputSchema.optional(),
		dueFrom: dateInputSchema.optional(),
		dueTo: dateInputSchema.optional(),
		sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'domain', 'dueAt']).default('createdAt'),
		sortDirection: z.enum(['asc', 'desc']).default('desc'),
		limit: z.number().int().min(1).max(100).default(40),
		cursor: cursorSchema
	})
	.strict()
	.superRefine((value, context) => {
		if (value.createdFrom && value.createdTo && value.createdFrom > value.createdTo) {
			context.addIssue({
				code: 'custom',
				path: ['createdTo'],
				message: 'createdTo must not be earlier than createdFrom'
			});
		}
		if (value.dueFrom && value.dueTo && value.dueFrom > value.dueTo) {
			context.addIssue({
				code: 'custom',
				path: ['dueTo'],
				message: 'dueTo must not be earlier than dueFrom'
			});
		}
	});

const bulkBase = { itemIds: itemIdsSchema };

export const bulkActionSchema = z.discriminatedUnion('action', [
	z.object({ ...bulkBase, action: z.literal('favorite') }).strict(),
	z.object({ ...bulkBase, action: z.literal('unfavorite') }).strict(),
	z.object({ ...bulkBase, action: z.literal('archive') }).strict(),
	z.object({ ...bulkBase, action: z.literal('unarchive') }).strict(),
	z.object({ ...bulkBase, action: z.literal('delete') }).strict(),
	z
		.object({
			...bulkBase,
			action: z.literal('move_collection'),
			collectionId: nullableCollectionIdSchema
		})
		.strict(),
	z.object({ ...bulkBase, action: z.literal('add_tags'), tagIds: nonEmptyTagIdsSchema }).strict(),
	z.object({ ...bulkBase, action: z.literal('remove_tags'), tagIds: nonEmptyTagIdsSchema }).strict()
]);

export const itemIdSchema = z.object({ itemId: idSchema }).strict();

export type CreateLinkInput = z.input<typeof createLinkSchema>;
export type UpdateLinkInput = z.input<typeof updateLinkSchema>;
export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;
export type CreateReminderInput = z.input<typeof createReminderSchema>;
export type UpdateReminderInput = z.input<typeof updateReminderSchema>;
export type ListItemsInput = z.input<typeof listItemsSchema>;
export type BulkActionInput = z.input<typeof bulkActionSchema>;

export type ParsedCreateLinkInput = z.output<typeof createLinkSchema>;
export type ParsedUpdateLinkInput = z.output<typeof updateLinkSchema>;
export type ParsedCreateNoteInput = z.output<typeof createNoteSchema>;
export type ParsedUpdateNoteInput = z.output<typeof updateNoteSchema>;
export type ParsedCreateReminderInput = z.output<typeof createReminderSchema>;
export type ParsedUpdateReminderInput = z.output<typeof updateReminderSchema>;
export type ParsedListItemsInput = z.output<typeof listItemsSchema>;
export type ParsedBulkActionInput = z.output<typeof bulkActionSchema>;
