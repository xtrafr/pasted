import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { JobWithMetadata } from 'pg-boss';
import { getMetadataBoss, stopMetadataBoss } from './boss';
import {
	METADATA_HEARTBEAT_SECONDS,
	METADATA_LOCAL_CONCURRENCY,
	METADATA_QUEUE
} from './constants';
import { recordWorkerHeartbeat, registerWorkerHeartbeat } from './heartbeat';
import { jobLogger } from './log';
import { processMetadataJob, type MetadataJobData, type MetadataJobResult } from './processor';
import { closeWorkerDatabase, workerDb } from './worker-database';

export interface MetadataWorkerHandle {
	workerId: string;
	workId: string;
	stop: () => Promise<void>;
}

export async function startMetadataWorker(): Promise<MetadataWorkerHandle> {
	const configuredWorkerId = process.env.WORKER_ID?.trim();
	const workerId = configuredWorkerId || `${hostname()}:${process.pid}:${randomUUID()}`;
	const heartbeatMetadata = {
		status: 'running',
		pid: process.pid,
		hostname: hostname(),
		concurrency: METADATA_LOCAL_CONCURRENCY
	};

	const boss = await getMetadataBoss();
	const workOptions = {
		includeMetadata: true,
		localConcurrency: METADATA_LOCAL_CONCURRENCY,
		groupConcurrency: 1,
		pollingIntervalSeconds: 1,
		notifyPollingIntervalSeconds: 30,
		heartbeatRefreshSeconds: Math.floor(METADATA_HEARTBEAT_SECONDS / 2)
	} as const;
	const workId = await boss.work<
		MetadataJobData,
		MetadataJobResult | undefined,
		typeof workOptions
	>(METADATA_QUEUE, workOptions, async (jobs: JobWithMetadata<MetadataJobData>[]) => {
		const job = jobs[0];
		if (!job) return;
		return processMetadataJob(workerDb, job);
	});
	await registerWorkerHeartbeat(workerDb, workerId, heartbeatMetadata);

	const heartbeatTimer = setInterval(() => {
		void recordWorkerHeartbeat(workerDb, workerId, heartbeatMetadata).catch(() => {
			jobLogger.warn({ workerId }, 'Worker heartbeat could not be recorded');
		});
	}, 15_000);
	heartbeatTimer.unref();

	let stopped = false;
	return {
		workerId,
		workId,
		stop: async () => {
			if (stopped) return;
			stopped = true;
			clearInterval(heartbeatTimer);
			await recordWorkerHeartbeat(workerDb, workerId, {
				...heartbeatMetadata,
				status: 'stopped',
				stoppedAt: new Date().toISOString()
			}).catch(() => undefined);
			await stopMetadataBoss();
			await closeWorkerDatabase();
		}
	};
}

async function run(): Promise<void> {
	const worker = await startMetadataWorker();
	jobLogger.info(
		{ workerId: worker.workerId, workId: worker.workId, concurrency: METADATA_LOCAL_CONCURRENCY },
		'Metadata worker started'
	);

	let stopping = false;
	const stop = async (signal: string) => {
		if (stopping) return;
		stopping = true;
		jobLogger.info({ signal, workerId: worker.workerId }, 'Metadata worker stopping');
		await worker.stop();
	};
	process.once('SIGINT', () => void stop('SIGINT'));
	process.once('SIGTERM', () => void stop('SIGTERM'));
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
	void run().catch(async (error: unknown) => {
		jobLogger.fatal(
			{ message: error instanceof Error ? error.message : 'Unknown startup error' },
			'Metadata worker could not start'
		);
		await stopMetadataBoss().catch(() => undefined);
		await closeWorkerDatabase().catch(() => undefined);
		process.exitCode = 1;
	});
}
