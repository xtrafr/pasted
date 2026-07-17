import { stripInvisibleUnicode } from './unicode';
import type { SecretFinding, SecretKind } from './types';

const SENSITIVE_QUERY_NAMES = new Set([
	'access_token',
	'api_key',
	'apikey',
	'auth',
	'authorization',
	'client_secret',
	'jwt',
	'password',
	'passwd',
	'secret',
	'sig',
	'signature',
	'token',
	'webhook'
]);

const TOKEN_PATTERNS: ReadonlyArray<{
	kind: SecretKind;
	label: string;
	pattern: RegExp;
	mask: RegExp;
}> = [
	{
		kind: 'api-key',
		label: 'AWS access key',
		pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
		mask: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g
	},
	{
		kind: 'access-token',
		label: 'GitHub token',
		pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,255}\b/,
		mask: /\bgh[pousr]_[A-Za-z0-9_]{30,255}\b/g
	},
	{
		kind: 'access-token',
		label: 'GitLab token',
		pattern: /\bglpat-[A-Za-z0-9_-]{20,255}\b/,
		mask: /\bglpat-[A-Za-z0-9_-]{20,255}\b/g
	},
	{
		kind: 'access-token',
		label: 'Slack token',
		pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/,
		mask: /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/g
	},
	{
		kind: 'api-key',
		label: 'Stripe secret key',
		pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,255}\b/,
		mask: /\bsk_(?:live|test)_[A-Za-z0-9]{16,255}\b/g
	},
	{
		kind: 'jwt',
		label: 'JSON Web Token',
		pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
		mask: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
	}
];

function finding(kind: SecretKind, label: string): SecretFinding {
	return { kind, label, maskedPreview: '[redacted]' };
}

function tryUrl(value: string): URL | undefined {
	let input = stripInvisibleUnicode(value).trim();
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input);
	const isBareUrl = /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,63}(?::\d{2,5})?(?:[/?#]|$)/i.test(input);
	if (!hasScheme && !isBareUrl) return undefined;
	if (!hasScheme) input = `https://${input}`;
	try {
		return new URL(input);
	} catch {
		return undefined;
	}
}

function queryValueLooksSensitive(name: string, value: string): boolean {
	const normalizedName = name.toLowerCase();
	if (SENSITIVE_QUERY_NAMES.has(normalizedName)) return value.length > 0;
	if (normalizedName === 'key' || normalizedName === 'code') return value.length >= 12;
	return false;
}

export function detectSecrets(value: string): SecretFinding[] {
	const clean = stripInvisibleUnicode(value);
	const findings: SecretFinding[] = [];
	const seen = new Set<string>();
	const add = (item: SecretFinding): void => {
		const key = `${item.kind}:${item.label}`;
		if (!seen.has(key)) {
			seen.add(key);
			findings.push(item);
		}
	};

	const url = tryUrl(clean);
	if (url?.username || url?.password) add(finding('credentials', 'Credentials embedded in URL'));
	if (url) {
		for (const [name, queryValue] of url.searchParams) {
			if (queryValueLooksSensitive(name, queryValue)) {
				add({
					kind: 'sensitive-query',
					label: `Sensitive query parameter: ${name}`,
					maskedPreview: `${name}=[redacted]`
				});
			}
		}
		if (
			(url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/')) ||
			(/(^|\.)discord(?:app)?\.com$/i.test(url.hostname) && url.pathname.includes('/webhooks/'))
		) {
			add(finding('webhook', 'Webhook URL'));
		}
	}

	for (const token of TOKEN_PATTERNS) {
		if (token.pattern.test(clean)) add(finding(token.kind, token.label));
	}

	return findings;
}

export function maskSecrets(value: string): string {
	let masked = stripInvisibleUnicode(value);
	const parsed = tryUrl(masked);
	if (parsed) {
		const hadImplicitScheme = !/^[a-z][a-z0-9+.-]*:/i.test(masked.trim());
		if (parsed.username) parsed.username = 'redacted';
		if (parsed.password) parsed.password = 'redacted';
		for (const [name, queryValue] of [...parsed.searchParams]) {
			if (queryValueLooksSensitive(name, queryValue)) parsed.searchParams.set(name, 'redacted');
		}
		if (parsed.hostname === 'hooks.slack.com' && parsed.pathname.startsWith('/services/')) {
			parsed.pathname = '/services/redacted';
		} else if (
			/(^|\.)discord(?:app)?\.com$/i.test(parsed.hostname) &&
			parsed.pathname.includes('/webhooks/')
		) {
			parsed.pathname = `${parsed.pathname.slice(0, parsed.pathname.indexOf('/webhooks/') + 10)}redacted`;
		}
		masked = parsed.href;
		if (hadImplicitScheme) masked = masked.replace(/^https:\/\//, '');
	}

	for (const token of TOKEN_PATTERNS) masked = masked.replace(token.mask, '[redacted]');
	return masked;
}
