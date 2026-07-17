<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { authClient } from '$lib/auth-client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		submitting = true;

		const result = await authClient.signUp.email({
			name,
			email,
			password,
			callbackURL: '/app'
		});

		submitting = false;
		if (result.error) {
			errorMessage =
				result.error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
					? 'An account already uses that email.'
					: 'We could not create the account. Check the form and try again.';
			return;
		}

		await invalidateAll();
		await goto(resolve('/app'));
	}

	async function signUpWithGitHub() {
		await authClient.signIn.social({ provider: 'github', callbackURL: '/app' });
	}
</script>

<svelte:head>
	<title>Create an account | Pasted</title>
</svelte:head>

<div class="auth-form">
	<header>
		<p class="eyebrow">Your quiet corner</p>
		<h1>Keep the useful bits.</h1>
		<p>Start a private library you can search, move and take with you.</p>
	</header>

	<form onsubmit={submit}>
		<Input label="Name" autocomplete="name" required maxlength={80} bind:value={name} />
		<Input label="Email" type="email" autocomplete="email" required bind:value={email} />
		<Input
			label="Password"
			type="password"
			autocomplete="new-password"
			description="Use at least 12 characters."
			required
			minlength={12}
			maxlength={128}
			bind:value={password}
		/>

		{#if errorMessage}
			<p class="form-error" role="alert">{errorMessage}</p>
		{/if}

		<Button type="submit" fullWidth loading={submitting} loadingLabel="Creating account">
			Create account
		</Button>
	</form>

	{#if data.githubEnabled}
		<div class="divider"><span>or</span></div>
		<Button variant="outline" fullWidth onclick={signUpWithGitHub}>Continue with GitHub</Button>
	{/if}

	<p class="auth-switch">Already have an account? <a href={resolve('/login')}>Sign in</a></p>
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
		font-size: clamp(2.5rem, 8vw, 4.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.92;
	}

	header > p:last-child,
	.auth-switch {
		color: var(--text-muted);
	}

	.form-error {
		border-left: 3px solid var(--surface-accent);
		padding-left: var(--space-3-75);
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3-75);
		color: var(--text-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
	}

	.divider::before,
	.divider::after {
		height: 1px;
		flex: 1;
		background: var(--border-subtle);
		content: '';
	}

	.auth-switch {
		font-size: var(--text-body-small);
		text-align: center;
	}

	.auth-switch a {
		color: var(--text-primary);
		font-weight: var(--font-weight-medium);
		text-underline-offset: 0.2em;
	}
</style>
