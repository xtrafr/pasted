const REDACTED = '[redacted]';
const SENSITIVE_KEY =
	/(?:password|passphrase|secret|token|authorization|cookie|credential|access[-_]?code|api[-_]?key|url)$/i;
const URL_TEXT = /https?:\/\/[^\s"'<>]+/gi;
const BEARER_TEXT = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const ASSIGNED_SECRET = /\b(password|token|secret|access[-_]?code|api[-_]?key)=([^\s&]+)/gi;

function redactText(value: string): string {
	return value
		.replace(URL_TEXT, '[redacted-url]')
		.replace(BEARER_TEXT, 'Bearer [redacted]')
		.replace(ASSIGNED_SECRET, '$1=[redacted]');
}

function redactValue(value: unknown, key: string, seen: WeakSet<object>, depth: number): unknown {
	if (SENSITIVE_KEY.test(key)) return REDACTED;
	if (typeof value === 'string') return redactText(value);
	if (value === null || typeof value !== 'object') return value;
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Error) return { name: value.name };
	if (depth >= 12) return '[truncated]';
	if (seen.has(value)) return '[circular]';
	seen.add(value);

	if (Array.isArray(value)) {
		return value.map((entry) => redactValue(entry, '', seen, depth + 1));
	}

	const output: Record<string, unknown> = {};
	for (const [entryKey, entryValue] of Object.entries(value)) {
		output[entryKey] = redactValue(entryValue, entryKey, seen, depth + 1);
	}
	return output;
}

export function redactLogObject(input: Record<string, unknown>): Record<string, unknown> {
	return redactValue(input, '', new WeakSet<object>(), 0) as Record<string, unknown>;
}
