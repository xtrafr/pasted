import pino from 'pino';
import { env } from '$env/dynamic/private';
import { redactLogObject } from './log-redaction';

export const logger = pino({
	level: env.LOG_LEVEL ?? 'info',
	base: {
		service: 'pasted'
	},
	formatters: {
		log: redactLogObject
	},
	redact: {
		paths: [
			'password',
			'*.password',
			'token',
			'*.token',
			'url',
			'*.url',
			'originalUrl',
			'*.originalUrl',
			'normalizedUrl',
			'*.normalizedUrl',
			'err.message',
			'err.stack',
			'err.cause',
			'req.headers.authorization',
			'req.headers.cookie',
			'res.headers.set-cookie'
		],
		censor: '[redacted]'
	}
});
