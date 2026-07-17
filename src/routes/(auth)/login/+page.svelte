<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	type ApiResult<T> =
		{ ok: true; data: T } | { ok: false; error?: { code?: string; message?: string } };

	let accessCode = $state('');
	let showCode = $state(false);
	let fieldError = $state('');
	let errorMessage = $state('');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		fieldError = '';
		errorMessage = '';
		const normalizedCode = accessCode.trim();

		if (normalizedCode.length !== 32) {
			fieldError = 'Enter the complete 32-character access code.';
			return;
		}

		submitting = true;
		try {
			const response = await fetch('/api/v1/access/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ accessCode: normalizedCode })
			});
			const payload = (await response.json().catch(() => null)) as ApiResult<unknown> | null;

			if (!response.ok || !payload?.ok) {
				errorMessage =
					response.status === 429
						? 'Too many attempts. Wait a moment and try again.'
						: 'That access code was not recognized. Check the code and try again.';
				return;
			}

			await invalidateAll();
			await goto(resolve('/app'));
		} catch {
			errorMessage = 'Pasted could not be reached. Check your connection and try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Log in | Pasted</title>
	<meta name="description" content="Log in to Pasted with your private access code." />
</svelte:head>

<div class="auth-form">
	<header>
		<p class="eyebrow">Welcome back</p>
		<h1>Open your library.</h1>
		<p>Enter the 32-character access code you saved when you created your account.</p>
	</header>

	<form onsubmit={submit} novalidate>
		<Input
			label="Access code"
			type={showCode ? 'text' : 'password'}
			autocomplete="off"
			autocapitalize="none"
			spellcheck={false}
			placeholder="32-character code"
			description="Your code is the only way to access this account."
			error={fieldError}
			required
			minlength={32}
			maxlength={32}
			bind:value={accessCode}
		/>
		<div class="code-tools">
			<button type="button" onclick={() => (showCode = !showCode)}>
				{showCode ? 'Hide code' : 'Show code'}
			</button>
			<span>{accessCode.trim().length} / 32</span>
		</div>

		{#if errorMessage}
			<p class="form-error" role="alert">{errorMessage}</p>
		{/if}

		<Button type="submit" fullWidth loading={submitting} loadingLabel="Opening library">
			Log in
		</Button>
	</form>

	<div class="help-note">
		<strong>Lost your code?</strong>
		<p>
			For your privacy, Pasted has no alternate recovery or reset flow. You will need to create a
			new account.
		</p>
	</div>

	<p class="auth-switch">New to Pasted? <a href={resolve('/register')}>Create an account</a></p>
</div>

<style>
	.auth-form,
	form {
		display: grid;
		gap: var(--space-5);
	}

	header {
		display: grid;
		gap: var(--space-2-5);
		margin-bottom: var(--space-2-5);
	}

	.eyebrow {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(2.75rem, 8vw, 4.75rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.045em;
		line-height: 0.9;
	}

	header > p:last-child,
	.auth-switch,
	.help-note p {
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.code-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: calc(var(--space-2) * -1);
	}

	.code-tools button {
		min-height: 2.5rem;
		border: 0;
		background: transparent;
		color: var(--text-primary);
		padding: 0;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-decoration: underline;
		text-underline-offset: 0.25em;
		text-transform: uppercase;
	}

	.code-tools span {
		color: var(--text-muted);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: var(--text-caption);
	}

	.form-error {
		border-left: 3px solid var(--surface-accent);
		padding-left: var(--space-3-75);
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.help-note {
		display: grid;
		gap: 0.35rem;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--color-echo-green) 26%, var(--surface-canvas));
		padding: 1rem;
	}

	.help-note strong {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.auth-switch {
		text-align: center;
	}

	.auth-switch a {
		color: var(--text-primary);
		font-weight: var(--font-weight-medium);
		text-underline-offset: 0.2em;
	}
</style>
