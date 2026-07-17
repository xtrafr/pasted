import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { JobWithMetadata } from 'pg-boss';
import { fetchLinkMetadata, fetchMetadataImage } from '$lib/server/metadata/fetch';
import { links, linkTargets, mediaAssets } from '$lib/server/db/schema';
import {
	cleanupUnreferencedMediaAssets,
	refreshSearchDocuments
} from '$lib/server/repositories/items.repository';
import type { DatabaseExecutor } from '$lib/server/repositories/types';
import { jobLogger } from './log';
import { classifyMetadataFailure, metadataNextRetryAt } from './policy';
import { HostRateGate } from './rate-limit';

export interface MetadataJobData {
	userId: string;
	targetId: string;
}

export interface MetadataJobResult {
	status: 'ready' | 'blocked' | 'missing';
	code?: string;
}

const sharedRateGate = new HostRateGate();

async function persistMediaAsset(
	executor: DatabaseExecutor,
	userId: string,
	kind: 'favicon' | 'preview',
	bytes: Buffer,
	mimeType: string
): Promise<string> {
	const sha256 = createHash('sha256').update(bytes).digest('hex');
	const [inserted] = await executor
		.insert(mediaAssets)
		.values({ userId, kind, sha256, bytes, mimeType, sizeBytes: bytes.byteLength })
		.onConflictDoNothing({ target: [mediaAssets.userId, mediaAssets.sha256] })
		.returning({ id: mediaAssets.id });
	if (inserted) return inserted.id;

	const [existing] = await executor
		.select({ id: mediaAssets.id })
		.from(mediaAssets)
		.where(and(eq(mediaAssets.userId, userId), eq(mediaAssets.sha256, sha256)))
		.limit(1);
	if (!existing) throw new Error('Media asset disappeared after conflict');
	return existing.id;
}

async function refreshTargetSearch(
	executor: DatabaseExecutor,
	userId: string,
	targetId: string
): Promise<void> {
	const rows = await executor
		.select({ itemId: links.itemId })
		.from(links)
		.where(and(eq(links.userId, userId), eq(links.targetId, targetId)));
	if (rows.length === 0) return;
	await refreshSearchDocuments(
		executor,
		userId,
		rows.map((row) => row.itemId)
	);
}

async function processImage(
	executor: DatabaseExecutor,
	job: JobWithMetadata<MetadataJobData>,
	kind: 'favicon' | 'preview',
	url: string,
	rateGate: HostRateGate
): Promise<void> {
	await rateGate.wait(new URL(url).hostname, job.signal);
	const image = await fetchMetadataImage(url, kind);
	const assetId = await persistMediaAsset(
		executor,
		job.data.userId,
		kind,
		image.bytes,
		image.mimeType
	);
	let attached = false;
	try {
		const rows = await executor
			.update(linkTargets)
			.set({
				...(kind === 'favicon' ? { faviconAssetId: assetId } : { previewAssetId: assetId }),
				updatedAt: new Date()
			})
			.where(
				and(
					eq(linkTargets.userId, job.data.userId),
					eq(linkTargets.id, job.data.targetId),
					sql`exists (
						select 1
						from ${links} as live_link
						where live_link.user_id = ${job.data.userId}
							and live_link.target_id = ${linkTargets.id}
					)`
				)
			)
			.returning({ id: linkTargets.id });
		attached = rows.length > 0;
	} finally {
		if (!attached) {
			await cleanupUnreferencedMediaAssets(executor, job.data.userId, [assetId]);
		}
	}
}

export async function processMetadataJob(
	executor: DatabaseExecutor,
	job: JobWithMetadata<MetadataJobData>,
	rateGate: HostRateGate = sharedRateGate
): Promise<MetadataJobResult> {
	const [target] = await executor
		.select({
			id: linkTargets.id,
			normalizedUrl: linkTargets.normalizedUrl
		})
		.from(linkTargets)
		.innerJoin(links, and(eq(links.userId, job.data.userId), eq(links.targetId, linkTargets.id)))
		.where(and(eq(linkTargets.userId, job.data.userId), eq(linkTargets.id, job.data.targetId)))
		.limit(1);
	if (!target) return { status: 'missing' };

	await executor
		.update(linkTargets)
		.set({
			metadataState: 'fetching',
			metadataErrorCode: null,
			nextRetryAt: null,
			updatedAt: new Date()
		})
		.where(and(eq(linkTargets.userId, job.data.userId), eq(linkTargets.id, job.data.targetId)));

	try {
		await rateGate.wait(new URL(target.normalizedUrl).hostname, job.signal);
		const metadata = await fetchLinkMetadata(target.normalizedUrl);

		await executor
			.update(linkTargets)
			.set({
				metadataTitle: metadata.title ?? null,
				metadataDescription: metadata.description ?? null,
				siteName: metadata.siteName ?? null,
				httpStatus: metadata.statusCode,
				updatedAt: new Date()
			})
			.where(and(eq(linkTargets.userId, job.data.userId), eq(linkTargets.id, job.data.targetId)));
		await refreshTargetSearch(executor, job.data.userId, job.data.targetId);

		const images = [
			...(metadata.faviconUrl ? [{ kind: 'favicon' as const, url: metadata.faviconUrl }] : []),
			...(metadata.imageUrl ? [{ kind: 'preview' as const, url: metadata.imageUrl }] : [])
		];
		for (const image of images) {
			try {
				await processImage(executor, job, image.kind, image.url, rateGate);
			} catch (error) {
				const failure = classifyMetadataFailure(error);
				jobLogger.warn(
					{ targetId: job.data.targetId, kind: image.kind, code: failure.code },
					'Metadata image was skipped'
				);
			}
		}

		const completed = await executor
			.update(linkTargets)
			.set({
				metadataState: 'ready',
				metadataErrorCode: null,
				httpStatus: metadata.statusCode,
				lastFetchedAt: new Date(),
				nextRetryAt: null,
				updatedAt: new Date()
			})
			.where(and(eq(linkTargets.userId, job.data.userId), eq(linkTargets.id, job.data.targetId)))
			.returning({ id: linkTargets.id });
		return completed.length > 0 ? { status: 'ready' } : { status: 'missing' };
	} catch (error) {
		const failure = classifyMetadataFailure(error);
		const terminal = failure.state === 'blocked' || job.retryCount >= job.retryLimit;
		await executor
			.update(linkTargets)
			.set({
				metadataState: failure.state,
				metadataErrorCode: failure.code,
				lastFetchedAt: new Date(),
				nextRetryAt: terminal
					? null
					: metadataNextRetryAt(job.retryCount, job.retryLimit, new Date()),
				updatedAt: new Date()
			})
			.where(and(eq(linkTargets.userId, job.data.userId), eq(linkTargets.id, job.data.targetId)));

		jobLogger.warn(
			{
				targetId: job.data.targetId,
				code: failure.code,
				retryCount: job.retryCount,
				terminal
			},
			'Metadata fetch did not complete'
		);
		if (failure.state === 'blocked') return { status: 'blocked', code: failure.code };

		const retryError = new Error(`Metadata fetch failed with code ${failure.code}`);
		Object.assign(retryError, { code: failure.code });
		throw retryError;
	}
}
