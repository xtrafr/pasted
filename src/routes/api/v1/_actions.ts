import { z } from 'zod';
import { tagIdsSchema } from '$lib/server/validation';

export const favoriteBodySchema = z.object({ favorite: z.boolean() }).strict();
export const archivedBodySchema = z.object({ archived: z.boolean() }).strict();
export const completedBodySchema = z.object({ completed: z.boolean() }).strict();
export const itemTagsBodySchema = z.object({ tagIds: tagIdsSchema }).strict();
