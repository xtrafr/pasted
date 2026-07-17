import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { linkTargets, mediaAssets } from '$lib/server/db/schema';
import { notFound, parseInput, requireUserId, toServiceError } from '$lib/server/errors';
import { getMetadataBoss, metadataHostGroup } from './boss';
import { METADATA_FRESHNESS_MS, METADATA_QUEUE } from './constants';
import { jobLogger } from './log';
import { metadataIsFresh } from './policy';

const metadataRequestSchema = z
	.object({
		targetId: z.uuid(),
		force: z.boolean().optional()
	})
	.strict();

async function jobServiceOperation<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw toServiceError(error);
	}
}

export async function getOwnedMetadataStatus(userId: string, targetId: string) {
	return jobServiceOperation(async () => {
		const ownerId = requireUserId(userId);
		const parsedTargetId = parseInput(z.uuid(), targetId);
		const [target] = await db
			.select({
				id: linkTargets.id,
				domain: linkTargets.domain,
				metadataTitle: linkTargets.metadataTitle,
				metadataDescription: linkTargets.metadataDescription,
				siteName: linkTargets.siteName,
				faviconAssetId: linkTargets.faviconAssetId,
				previewAssetId: linkTargets.previewAssetId,
				state: linkTargets.metadataState,
				errorCode: linkTargets.metadataErrorCode,
				httpStatus: linkTargets.httpStatus,
				lastFetchedAt: linkTargets.lastFetchedAt,
				nextRetryAt: linkTargets.nextRetryAt,
				updatedAt: linkTargets.updatedAt
			})
			.from(linkTargets)
			.where(and(eq(linkTargets.userId, ownerId), eq(linkTargets.id, parsedTargetId)))
			.limit(1);
		if (!target) throw notFound('Link target');

		return {
			id: target.id,
			domain: target.domain,
			metadataTitle: target.metadataTitle,
			metadataDescription: target.metadataDescription,
			siteName: target.siteName,
			state: target.state,
			errorCode: target.errorCode,
			httpStatus: target.httpStatus,
			lastFetchedAt: target.lastFetchedAt,
			nextRetryAt: target.nextRetryAt,
			updatedAt: target.updatedAt,
			faviconUrl: target.faviconAssetId ? `/api/v1/metadata/assets/${target.faviconAssetId}` : null,
			previewUrl: target.previewAssetId ? `/api/v1/metadata/assets/${target.previewAssetId}` : null
		};
	});
}

export async function enqueueOwnedMetadata(
	userId: string,
	input: { targetId: string; force?: boolean }
) {
	return jobServiceOperation(async () => {
		const ownerId = requireUserId(userId);
		const parsed = parseInput(metadataRequestSchema, input);
		const [target] = await db
			.select({
				id: linkTargets.id,
				normalizedUrl: linkTargets.normalizedUrl,
				state: linkTargets.metadataState,
				lastFetchedAt: linkTargets.lastFetchedAt
			})
			.from(linkTargets)
			.where(and(eq(linkTargets.userId, ownerId), eq(linkTargets.id, parsed.targetId)))
			.limit(1);
		if (!target) throw notFound('Link target');

		const now = new Date();
		if (target.state === 'fetching') {
			return { queued: false, reason: 'fetching', targetId: target.id } as const;
		}
		if (
			!parsed.force &&
			target.state === 'ready' &&
			metadataIsFresh(target.lastFetchedAt, now, METADATA_FRESHNESS_MS)
		) {
			return { queued: false, reason: 'fresh', targetId: target.id } as const;
		}

		await db
			.update(linkTargets)
			.set({
				metadataState: 'pending',
				metadataErrorCode: null,
				nextRetryAt: null,
				updatedAt: now
			})
			.where(and(eq(linkTargets.userId, ownerId), eq(linkTargets.id, target.id)));

		try {
			const boss = await getMetadataBoss();
			const jobId = await boss.send(
				METADATA_QUEUE,
				{ userId: ownerId, targetId: target.id },
				{
					singletonKey: target.id,
					singletonSeconds: 30,
					group: { id: metadataHostGroup(target.normalizedUrl) }
				}
			);
			return {
				queued: jobId !== null,
				reason: jobId === null ? ('duplicate' as const) : ('queued' as const),
				targetId: target.id,
				jobId
			};
		} catch {
			await db
				.update(linkTargets)
				.set({
					metadataState: 'failed',
					metadataErrorCode: 'queue_unavailable',
					nextRetryAt: new Date(now.getTime() + 60_000),
					updatedAt: new Date()
				})
				.where(and(eq(linkTargets.userId, ownerId), eq(linkTargets.id, target.id)));
			throw new Error('The metadata job could not be queued');
		}
	});
}

export async function enqueueOwnedMetadataBestEffort(
	userId: string,
	targetIds: readonly string[]
): Promise<void> {
	const uniqueTargetIds = [...new Set(targetIds)].slice(0, 1_000);
	let nextIndex = 0;
	const enqueueNext = async () => {
		while (nextIndex < uniqueTargetIds.length) {
			const targetId = uniqueTargetIds[nextIndex++];
			if (!targetId) continue;
			try {
				await enqueueOwnedMetadata(userId, { targetId });
			} catch (error) {
				jobLogger.warn(
					{
						targetId,
						message: error instanceof Error ? error.message : 'Unknown queue error'
					},
					'Automatic metadata enqueue was skipped'
				);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(4, uniqueTargetIds.length) }, () => enqueueNext())
	);
}

export async function getOwnedMetadataAsset(userId: string, assetId: string) {
	return jobServiceOperation(async () => {
		const ownerId = requireUserId(userId);
		const parsedAssetId = parseInput(z.uuid(), assetId);
		const [asset] = await db
			.select({
				bytes: mediaAssets.bytes,
				mimeType: mediaAssets.mimeType,
				sizeBytes: mediaAssets.sizeBytes,
				sha256: mediaAssets.sha256
			})
			.from(mediaAssets)
			.where(and(eq(mediaAssets.userId, ownerId), eq(mediaAssets.id, parsedAssetId)))
			.limit(1);
		if (!asset) throw notFound('Metadata asset');
		return asset;
	});
}
