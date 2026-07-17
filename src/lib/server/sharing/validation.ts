import { z } from 'zod';

export const createShareSchema = z
	.object({
		itemId: z.uuid().optional(),
		collectionId: z.uuid().optional(),
		expiresAt: z.iso.datetime({ offset: true }).nullable().optional()
	})
	.strict()
	.refine(
		(value) => Number(value.itemId !== undefined) + Number(value.collectionId !== undefined) === 1,
		{
			message: 'Choose exactly one item or collection',
			path: ['target']
		}
	);

export type CreateShareInput = z.input<typeof createShareSchema>;

export function shareIsActive(
	share: { revokedAt: Date | null; expiresAt: Date | null },
	now = new Date()
): boolean {
	return share.revokedAt === null && (share.expiresAt === null || share.expiresAt > now);
}
