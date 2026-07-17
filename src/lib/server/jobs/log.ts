import pino from 'pino';
import { redactLogObject } from '../log-redaction';

export const jobLogger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	base: { service: 'pasted', process: 'metadata-worker' },
	formatters: { log: redactLogObject },
	redact: {
		paths: ['accessCode', 'token', 'url', 'originalUrl', 'normalizedUrl', 'hostname'],
		censor: '[redacted]'
	}
});
