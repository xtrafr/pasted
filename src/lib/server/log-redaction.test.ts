import { describe, expect, it } from 'vitest';
import { redactLogObject } from './log-redaction';

describe('log redaction', () => {
	it('redacts sensitive values recursively without mutating safe context', () => {
		const output = redactLogObject({
			requestId: 'request-1',
			accessCode: 'Abcdefghijklmnop1234567890123456',
			body: {
				originalUrl: 'https://private.example/path?token=hidden',
				profile: { password: 'hidden-password' },
				items: [{ apiKey: 'hidden-key' }]
			},
			message: 'Fetch https://private.example/path failed with token=hidden-token',
			err: new Error('https://private.example/secret')
		});

		expect(output.requestId).toBe('request-1');
		expect(JSON.stringify(output)).not.toContain('private.example');
		expect(JSON.stringify(output)).not.toContain('hidden-password');
		expect(JSON.stringify(output)).not.toContain('hidden-key');
		expect(JSON.stringify(output)).not.toContain('hidden-token');
		expect(JSON.stringify(output)).not.toContain('Abcdefghijklmnop1234567890123456');
		expect(output.accessCode).toBe('[redacted]');
		expect(output.err).toEqual({ name: 'Error' });
	});
});
