import { workerHeartbeats } from '$lib/server/db/schema';
import type { DatabaseExecutor } from '$lib/server/repositories/types';

export async function registerWorkerHeartbeat(
	executor: DatabaseExecutor,
	workerId: string,
	metadata: Record<string, unknown>
): Promise<void> {
	const now = new Date();
	await executor
		.insert(workerHeartbeats)
		.values({
			workerId,
			processType: 'metadata',
			startedAt: now,
			lastSeenAt: now,
			metadata
		})
		.onConflictDoUpdate({
			target: workerHeartbeats.workerId,
			set: {
				processType: 'metadata',
				startedAt: now,
				lastSeenAt: now,
				metadata
			}
		});
}

export async function recordWorkerHeartbeat(
	executor: DatabaseExecutor,
	workerId: string,
	metadata: Record<string, unknown>
): Promise<void> {
	const now = new Date();
	await executor
		.insert(workerHeartbeats)
		.values({
			workerId,
			processType: 'metadata',
			startedAt: now,
			lastSeenAt: now,
			metadata
		})
		.onConflictDoUpdate({
			target: workerHeartbeats.workerId,
			set: { lastSeenAt: now, metadata }
		});
}
