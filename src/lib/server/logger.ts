import pino from 'pino';
import { env } from '$env/dynamic/private';

export const logger = pino({
	level: env.LOG_LEVEL ?? 'info',
	base: {
		service: 'pasted'
	},
	redact: {
		paths: [
			'password',
			'token',
			'url',
			'originalUrl',
			'normalizedUrl',
			'req.headers.authorization',
			'req.headers.cookie',
			'res.headers.set-cookie'
		],
		censor: '[redacted]'
	}
});
