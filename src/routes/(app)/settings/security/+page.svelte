<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { authClient } from '$lib/auth-client';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';
		if (newPassword !== confirmPassword) {
			errorMessage = 'The new passwords do not match.';
			return;
		}

		submitting = true;
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true
		});
		submitting = false;

		if (result.error) {
			errorMessage = 'The password could not be changed. Check your current password.';
			return;
		}

		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		successMessage = 'Your password has been changed.';
	}
</script>

<svelte:head>
	<title>Security | Pasted</title>
</svelte:head>

<main class="security-page">
	<header>
		<p>Account security</p>
		<h1>Change password</h1>
		<p>Changing it signs out your other sessions.</p>
	</header>

	<form onsubmit={submit}>
		<Input
			label="Current password"
			type="password"
			autocomplete="current-password"
			required
			bind:value={currentPassword}
		/>
		<Input
			label="New password"
			type="password"
			autocomplete="new-password"
			description="Use at least 12 characters."
			minlength={12}
			maxlength={128}
			required
			bind:value={newPassword}
		/>
		<Input
			label="Confirm new password"
			type="password"
			autocomplete="new-password"
			minlength={12}
			maxlength={128}
			required
			bind:value={confirmPassword}
		/>

		{#if errorMessage}<p class="message" role="alert">{errorMessage}</p>{/if}
		{#if successMessage}<p class="message" role="status">{successMessage}</p>{/if}

		<Button type="submit" loading={submitting} loadingLabel="Changing password">
			Change password
		</Button>
	</form>
</main>

<style>
	.security-page {
		display: grid;
		width: min(100%, 42rem);
		gap: var(--space-10);
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 7rem) var(--page-gutter);
	}

	header,
	form {
		display: grid;
		gap: var(--space-5);
	}

	h1,
	p {
		margin: 0;
	}

	header > p:first-child {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	h1 {
		font-family: var(--font-display);
		font-size: var(--text-heading-small);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.92;
	}

	header > p:last-child {
		color: var(--text-muted);
	}

	.message {
		border-left: 3px solid var(--surface-accent);
		padding-left: var(--space-3-75);
	}
</style>
