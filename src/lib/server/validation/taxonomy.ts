import { z } from 'zod';
import { colorSchema, descriptionSchema, iconSchema, idSchema, titleSchema } from './common';

export const createCollectionSchema = z
	.object({
		name: titleSchema.max(120),
		description: descriptionSchema.nullable().optional(),
		color: colorSchema.nullable().optional(),
		icon: iconSchema.nullable().optional(),
		sortOrder: z.number().int().min(-1_000_000).max(1_000_000).optional(),
		sortMode: z.enum(['manual', 'created_at', 'title']).optional()
	})
	.strict();

export const updateCollectionSchema = z
	.object({
		name: titleSchema.max(120).optional(),
		description: descriptionSchema.nullable().optional(),
		color: colorSchema.nullable().optional(),
		icon: iconSchema.nullable().optional(),
		sortOrder: z.number().int().min(-1_000_000).max(1_000_000).optional(),
		sortMode: z.enum(['manual', 'created_at', 'title']).optional()
	})
	.strict()
	.refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
		message: 'At least one collection field must be provided'
	});

export const createTagSchema = z
	.object({
		name: titleSchema.max(80),
		color: colorSchema.nullable().optional()
	})
	.strict();

export const updateTagSchema = z
	.object({
		name: titleSchema.max(80).optional(),
		color: colorSchema.nullable().optional()
	})
	.strict()
	.refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
		message: 'At least one tag field must be provided'
	});

export const entityIdSchema = z.object({ id: idSchema }).strict();

export type CreateCollectionInput = z.input<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.input<typeof updateCollectionSchema>;
export type CreateTagInput = z.input<typeof createTagSchema>;
export type UpdateTagInput = z.input<typeof updateTagSchema>;

export type ParsedCreateCollectionInput = z.output<typeof createCollectionSchema>;
export type ParsedUpdateCollectionInput = z.output<typeof updateCollectionSchema>;
export type ParsedCreateTagInput = z.output<typeof createTagSchema>;
export type ParsedUpdateTagInput = z.output<typeof updateTagSchema>;
