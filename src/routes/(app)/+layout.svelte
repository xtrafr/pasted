<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authClient } from '$lib/auth-client';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/'));
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-frame">
	<header class="app-frame__header">
		<PastedWordmark href="/app" size="small" aria-label="Pasted dashboard" />
		<div class="app-frame__account">
			<span>{data.user.email}</span>
			<Button variant="quiet" size="small" onclick={signOut} loading={signingOut}>Sign out</Button>
		</div>
	</header>
	{@render children()}
</div>

<style>
	.app-frame {
		min-height: 100vh;
	}

	.app-frame__header {
		display: flex;
		min-height: 4.5rem;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		border-bottom: var(--border-hairline) solid var(--border-default);
		padding: var(--space-3-75) var(--page-gutter);
	}

	.app-frame__account {
		display: flex;
		align-items: center;
		gap: var(--space-3-75);
		font-size: var(--text-body-small);
	}

	@media (max-width: 40rem) {
		.app-frame__account > span {
			display: none;
		}
	}
</style>
