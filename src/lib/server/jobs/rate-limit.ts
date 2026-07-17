import { METADATA_HOST_INTERVAL_MS } from './constants';

type Clock = () => number;
type Sleeper = (milliseconds: number, signal: AbortSignal | undefined) => Promise<void>;

function defaultSleep(milliseconds: number, signal: AbortSignal | undefined): Promise<void> {
	if (milliseconds <= 0) return Promise.resolve();
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			const error = new Error('The metadata job was cancelled');
			error.name = 'AbortError';
			reject(error);
			return;
		}

		const timeout = setTimeout(done, milliseconds);
		function done() {
			signal?.removeEventListener('abort', abort);
			resolve();
		}
		function abort() {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', abort);
			const error = new Error('The metadata job was cancelled');
			error.name = 'AbortError';
			reject(error);
		}
		signal?.addEventListener('abort', abort, { once: true });
	});
}

export class HostRateGate {
	readonly #nextAllowedAt = new Map<string, number>();
	readonly #intervalMs: number;
	readonly #now: Clock;
	readonly #sleep: Sleeper;

	constructor(options: { intervalMs?: number; now?: Clock; sleep?: Sleeper } = {}) {
		this.#intervalMs = Math.max(0, options.intervalMs ?? METADATA_HOST_INTERVAL_MS);
		this.#now = options.now ?? Date.now;
		this.#sleep = options.sleep ?? defaultSleep;
	}

	async wait(hostname: string, signal?: AbortSignal): Promise<void> {
		const key = hostname.toLowerCase().replace(/\.$/, '');
		const current = this.#now();
		if (this.#nextAllowedAt.size > 10_000) {
			for (const [storedHost, nextAllowedAt] of this.#nextAllowedAt) {
				if (nextAllowedAt <= current) this.#nextAllowedAt.delete(storedHost);
				if (this.#nextAllowedAt.size <= 8_000) break;
			}
		}
		const reservedAt = Math.max(current, this.#nextAllowedAt.get(key) ?? current);
		this.#nextAllowedAt.set(key, reservedAt + this.#intervalMs);
		await this.#sleep(reservedAt - current, signal);
	}
}
