import { describe, expect, it, vi } from 'vitest';
import { ServiceError } from '$lib/server/errors';
import { apiResponse, authenticatedApi, readJson } from '$lib/server/http/api';

describe('API response helpers', () => {
	it('wraps successful responses and honors a created status', async () => {
		const response = await apiResponse(() => ({ id: 'item-1', userId: 'private-owner-id' }), {
			status: 201
		});

		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ ok: true, data: { id: 'item-1' } });
	});

	it('requires an authenticated local before calling a service', async () => {
		const operation = vi.fn();
		const response = await authenticatedApi({ locals: {} }, operation);

		expect(operation).not.toHaveBeenCalled();
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			ok: false,
			error: { code: 'unauthorized', message: 'Authentication is required' }
		});
	});

	it('returns safe service error details for client errors', async () => {
		const response = await apiResponse(() => {
			throw new ServiceError('validation_failed', 'Invalid input', 400, {
				issues: [{ path: 'title', message: 'Required' }]
			});
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			ok: false,
			error: {
				code: 'validation_failed',
				message: 'Invalid input',
				details: { issues: [{ path: 'title', message: 'Required' }] }
			}
		});
	});

	it('rejects malformed JSON and non-JSON content types', async () => {
		await expect(
			readJson(new Request('https://pasted.test', { method: 'POST', body: '{}' }))
		).rejects.toMatchObject({ status: 415, code: 'validation_failed' });

		await expect(
			readJson(
				new Request('https://pasted.test', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: '{'
				})
			)
		).rejects.toMatchObject({ status: 400, code: 'validation_failed' });
	});
});
