<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	type RegisterData = { accessCode?: unknown };
	type ApiResult<T> =
		{ ok: true; data: T } | { ok: false; error?: { code?: string; message?: string } };

	let displayName = $state('');
	let accessCode = $state('');
	let errorMessage = $state('');
	let copyMessage = $state('');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		copyMessage = '';
		submitting = true;
		const normalizedName = displayName.trim();

		try {
			const response = await fetch('/api/v1/access/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(normalizedName ? { displayName: normalizedName } : {})
			});
			const payload = (await response.json().catch(() => null)) as ApiResult<RegisterData> | null;

			if (!response.ok || !payload?.ok) {
				errorMessage =
					response.status === 429
						? 'Too many accounts were created from this connection. Wait a moment and try again.'
						: 'Pasted could not create the account. Please try again.';
				return;
			}

			const issuedCode = payload.data.accessCode;
			if (typeof issuedCode !== 'string' || issuedCode.length !== 32) {
				errorMessage =
					'Pasted did not return a valid access code. Please contact the server owner.';
				return;
			}

			accessCode = issuedCode;
		} catch {
			errorMessage = 'Pasted could not be reached. Check your connection and try again.';
		} finally {
			submitting = false;
		}
	}

	function copyWithFallback(value: string) {
		const textarea = document.createElement('textarea');
		textarea.value = value;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		const copied = document.execCommand('copy');
		textarea.remove();
		if (!copied) throw new Error('Copy was not available');
	}

	async function copyCode() {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(accessCode);
			} else {
				copyWithFallback(accessCode);
			}
			copyMessage = 'Access code copied.';
		} catch {
			copyMessage = 'Copy failed. Select the code and copy it manually.';
		}
	}

	function downloadCode() {
		const fileContent = [
			'PASTED ACCESS CODE',
			'',
			accessCode,
			'',
			'This code is the only way to log in to this Pasted account.',
			'Store it somewhere private. Pasted cannot recover it for you.'
		].join('\n');
		const url = URL.createObjectURL(new Blob([fileContent], { type: 'text/plain;charset=utf-8' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = 'pasted-access-code.txt';
		link.click();
		URL.revokeObjectURL(url);
		copyMessage = 'Access code downloaded.';
	}

	async function continueToLibrary() {
		await invalidateAll();
		await goto(resolve('/app'));
	}
</script>

<svelte:head>
	<title>Create an account | Pasted</title>
	<meta name="description" content="Create a private Pasted library with one access code." />
</svelte:head>

{#if accessCode}
	<div class="code-result">
		<header>
			<p class="eyebrow">Account created</p>
			<h1>Save your access code.</h1>
			<p>This is the only time Pasted will show it to you.</p>
		</header>

		<div class="warning" role="alert">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3 2.8 20h18.4L12 3Z"></path>
				<path d="M12 9v5m0 3v.1"></path>
			</svg>
			<div>
				<strong>There is no recovery process.</strong>
				<p>If you lose this code, the account and its private library cannot be recovered.</p>
			</div>
		</div>

		<div class="code-box">
			<span>Your 32-character code</span>
			<code>{accessCode}</code>
		</div>

		<div class="code-actions">
			<Button type="button" fullWidth onclick={copyCode}>Copy code</Button>
			<Button type="button" variant="outline" fullWidth onclick={downloadCode}>Download code</Button
			>
		</div>
		<p class="copy-status" role="status" aria-live="polite">{copyMessage}</p>

		<div class="storage-tip">
			<strong>A good place to keep it</strong>
			<p>Save the file in an encrypted vault or add the code to a trusted credential manager.</p>
		</div>

		<Button type="button" variant="quiet" fullWidth onclick={continueToLibrary}>
			Continue to library
		</Button>
	</div>
{:else}
	<div class="auth-form">
		<header>
			<p class="eyebrow">Create your library</p>
			<h1>One code. No profile.</h1>
			<p>
				Choose an optional display name. Pasted will create your account and issue its only access
				code.
			</p>
		</header>

		<form onsubmit={submit}>
			<Input
				label="Display name (optional)"
				autocomplete="name"
				placeholder="How Pasted should address you"
				description="This stays inside your account and can be left blank."
				maxlength={80}
				bind:value={displayName}
			/>

			<div class="credential-explainer">
				<span aria-hidden="true">32</span>
				<div>
					<strong>Pasted creates your sign-in code</strong>
					<p>You will be able to copy or download it on the next screen.</p>
				</div>
			</div>

			{#if errorMessage}
				<p class="form-error" role="alert">{errorMessage}</p>
			{/if}

			<Button type="submit" fullWidth loading={submitting} loadingLabel="Creating account">
				Create account
			</Button>
		</form>

		<p class="terms-note">
			By continuing, you understand that Pasted cannot recover a lost access code.
		</p>

		<p class="auth-switch">Already have a code? <a href={resolve('/login')}>Log in</a></p>
	</div>
{/if}

<style>
	.auth-form,
	.code-result,
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
	.terms-note,
	.credential-explainer p,
	.storage-tip p,
	.warning p {
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.credential-explainer {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 1rem;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--color-echo-green) 26%, var(--surface-canvas));
		padding: 1rem;
	}

	.credential-explainer > span {
		display: grid;
		width: 3rem;
		height: 3rem;
		place-items: center;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		font-family: var(--font-times);
		font-size: 1.25rem;
	}

	.credential-explainer div,
	.storage-tip,
	.warning div {
		display: grid;
		gap: 0.25rem;
	}

	.credential-explainer strong,
	.storage-tip strong,
	.warning strong {
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.form-error {
		border-left: 3px solid var(--surface-accent);
		padding-left: var(--space-3-75);
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.terms-note {
		text-align: center;
	}

	.auth-switch {
		text-align: center;
	}

	.auth-switch a {
		color: var(--text-primary);
		font-weight: var(--font-weight-medium);
		text-underline-offset: 0.2em;
	}

	.warning {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.85rem;
		border: 2px solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 1rem;
	}

	.warning svg {
		width: 1.5rem;
		fill: color-mix(in srgb, var(--surface-accent) 32%, transparent);
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.code-box {
		display: grid;
		gap: 0.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-dark);
		color: var(--text-inverse);
		padding: 1rem;
	}

	.code-box span {
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.code-box code {
		color: var(--surface-accent);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: clamp(0.82rem, 3.2vw, 1.05rem);
		font-weight: 600;
		letter-spacing: 0.045em;
		overflow-wrap: anywhere;
		user-select: all;
	}

	.code-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.copy-status {
		min-height: 1.2rem;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		text-align: center;
	}

	.storage-tip {
		border-left: 3px solid var(--surface-accent);
		padding-left: 1rem;
	}

	@media (max-width: 30rem) {
		.code-actions {
			grid-template-columns: 1fr;
		}
	}
</style>
