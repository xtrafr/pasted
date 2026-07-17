import { createHash } from 'node:crypto';
import { PgBoss } from 'pg-boss';
import {
	METADATA_HEARTBEAT_SECONDS,
	METADATA_JOB_EXPIRE_SECONDS,
	METADATA_QUEUE,
	METADATA_RETRY_DELAY_MAX_SECONDS,
	METADATA_RETRY_DELAY_SECONDS,
	METADATA_RETRY_LIMIT
} from './constants';
import { jobLogger } from './log';

const localDatabaseUrl = 'postgres://pasted:pasted@127.0.0.1:5432/pasted';
let bossPromise: Promise<PgBoss> | undefined;

async function startBoss(): Promise<PgBoss> {
	const boss = new PgBoss({
		connectionString: process.env.DATABASE_URL ?? localDatabaseUrl,
		application_name: 'pasted-metadata-queue',
		max: 5,
		connectionTimeoutMillis: 5_000,
		useListenNotify: true
	});
	boss.on('error', (error) => {
		jobLogger.error({ message: error.message }, 'Metadata queue error');
	});
	boss.on('warning', (warning) => {
		jobLogger.warn({ message: warning.message }, 'Metadata queue warning');
	});

	try {
		await boss.start();
		await boss.createQueue(METADATA_QUEUE, {
			policy: 'standard',
			retryLimit: METADATA_RETRY_LIMIT,
			retryDelay: METADATA_RETRY_DELAY_SECONDS,
			retryBackoff: true,
			retryDelayMax: METADATA_RETRY_DELAY_MAX_SECONDS,
			expireInSeconds: METADATA_JOB_EXPIRE_SECONDS,
			heartbeatSeconds: METADATA_HEARTBEAT_SECONDS,
			deleteAfterSeconds: 86_400,
			retentionSeconds: 604_800,
			notify: true,
			warningQueueSize: 5_000
		});
		return boss;
	} catch (error) {
		await boss.stop({ close: true }).catch(() => undefined);
		throw error;
	}
}

export function metadataHostGroup(normalizedUrl: string): string {
	const hostname = new URL(normalizedUrl).hostname.toLowerCase().replace(/\.$/, '');
	return createHash('sha256').update(hostname, 'utf8').digest('hex').slice(0, 32);
}

export function getMetadataBoss(): Promise<PgBoss> {
	bossPromise ??= startBoss().catch((error) => {
		bossPromise = undefined;
		throw error;
	});
	return bossPromise;
}

export async function stopMetadataBoss(): Promise<void> {
	if (!bossPromise) return;
	const activePromise = bossPromise;
	bossPromise = undefined;
	const boss = await activePromise;
	await boss.stop({ close: true });
}
