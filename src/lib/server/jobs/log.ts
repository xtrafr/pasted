import pino from 'pino';

export const jobLogger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	base: { service: 'pasted', process: 'metadata-worker' },
	redact: {
		paths: ['token', 'url', 'originalUrl', 'normalizedUrl', 'hostname'],
		censor: '[redacted]'
	}
});
