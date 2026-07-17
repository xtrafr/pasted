import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { accessCredential, account, user } from '$lib/server/db/schema';
import { ServiceError, parseInput } from '$lib/server/errors';
import {
	accessLoginSchema,
	accessRegistrationSchema,
	createSyntheticEmail,
	generateAccessCode,
	hashAccessCode
} from './access-code';
import { enforceAccessRateLimit } from './rate-limit';

interface AccessAuthRequestContext {
	headers: Headers;
	clientAddress: string;
	applySessionHeaders: (headers: Headers) => void;
}

async function createBetterAuthSession(email: string, accessCode: string, headers: Headers) {
	const response = await auth.api.signInEmail({
		body: {
			email,
			password: accessCode,
			rememberMe: true
		},
		headers,
		asResponse: true
	});
	if (!response.ok) throw new Error('Better Auth rejected the credential');
	return response.headers;
}

export async function registerAccessAccount(
	input: unknown,
	requestContext: AccessAuthRequestContext
): Promise<{ accessCode: string }> {
	const request = parseInput(accessRegistrationSchema, input);
	await enforceAccessRateLimit('registerNetwork', requestContext.clientAddress);

	const accessCode = generateAccessCode();
	const lookupHash = hashAccessCode(accessCode);
	const passwordVerifier = await hashPassword(accessCode);
	const userId = randomUUID();
	const email = createSyntheticEmail();
	const now = new Date();

	await db.transaction(async (tx) => {
		await tx.insert(user).values({
			id: userId,
			name: request.displayName ?? 'Pasted user',
			email,
			emailVerified: true,
			createdAt: now,
			updatedAt: now
		});
		await tx.insert(account).values({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			password: passwordVerifier,
			createdAt: now,
			updatedAt: now
		});
		await tx.insert(accessCredential).values({
			userId,
			lookupHash,
			createdAt: now
		});
	});

	try {
		const sessionHeaders = await createBetterAuthSession(email, accessCode, requestContext.headers);
		requestContext.applySessionHeaders(sessionHeaders);
	} catch {
		// Do not strand an account whose one-time code could not be delivered.
		await db.delete(user).where(eq(user.id, userId));
		throw new ServiceError(
			'database_error',
			'The account could not be created. Please try again.',
			500
		);
	}

	return { accessCode };
}

export async function loginWithAccessCode(
	input: unknown,
	requestContext: AccessAuthRequestContext
): Promise<{ authenticated: true }> {
	const request = parseInput(accessLoginSchema, input);
	await enforceAccessRateLimit('loginNetwork', requestContext.clientAddress);
	const lookupHash = hashAccessCode(request.accessCode);

	const [credential] = await db
		.select({ userId: accessCredential.userId, email: user.email })
		.from(accessCredential)
		.innerJoin(user, eq(user.id, accessCredential.userId))
		.where(eq(accessCredential.lookupHash, lookupHash))
		.limit(1);

	if (credential) {
		await enforceAccessRateLimit('loginAccount', credential.userId);
	}

	try {
		// A synthetic miss still runs Better Auth's password hashing path, keeping
		// unknown and invalid account attempts close in observable cost.
		const sessionHeaders = await createBetterAuthSession(
			credential?.email ?? `${lookupHash.slice(0, 32)}@missing.pasted.invalid`,
			request.accessCode,
			requestContext.headers
		);
		requestContext.applySessionHeaders(sessionHeaders);
	} catch {
		throw new ServiceError('unauthorized', 'The access code is invalid', 401);
	}

	if (!credential) {
		throw new ServiceError('unauthorized', 'The access code is invalid', 401);
	}

	await db
		.update(accessCredential)
		.set({ lastUsedAt: new Date() })
		.where(eq(accessCredential.userId, credential.userId));

	return { authenticated: true };
}
