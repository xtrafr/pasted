import { z } from 'zod';

export const idSchema = z.string().uuid();
export const itemIdsSchema = z
	.array(idSchema)
	.min(1)
	.max(500)
	.transform((ids) => [...new Set(ids)]);
export const tagIdsSchema = z
	.array(idSchema)
	.max(50)
	.transform((ids) => [...new Set(ids)]);
export const nonEmptyTagIdsSchema = z
	.array(idSchema)
	.min(1)
	.max(50)
	.transform((ids) => [...new Set(ids)]);

export const nullableCollectionIdSchema = idSchema.nullable();

export const titleSchema = z.string().trim().min(1).max(300);
export const optionalTitleSchema = titleSchema.nullable().optional();
export const descriptionSchema = z.string().trim().max(2_000);
export const optionalDescriptionSchema = descriptionSchema.nullable().optional();
export const notesBodySchema = z.string().trim().min(1).max(100_000);
export const colorSchema = z
	.string()
	.trim()
	.regex(/^#[0-9a-f]{6}$/i, 'Color must be a six-digit hexadecimal value');
export const iconSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9-]+$/i, 'Icon must contain only letters, numbers, and hyphens');

export const dateInputSchema = z
	.union([z.date(), z.string().datetime({ offset: true })])
	.transform((value) => (value instanceof Date ? value : new Date(value)));

export const nullableDateInputSchema = z.union([dateInputSchema, z.null()]).optional();

export const timeZoneSchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.refine((value) => {
		try {
			new Intl.DateTimeFormat('en', { timeZone: value });
			return true;
		} catch {
			return false;
		}
	}, 'Time zone must be a valid IANA identifier');

export const cursorSchema = z.string().trim().min(1).max(1_024).optional();

export function strictPartialObject<TShape extends z.ZodRawShape>(shape: TShape) {
	return z.object(shape).strict();
}
