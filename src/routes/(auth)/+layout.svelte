<script lang="ts">
	import type { Snippet } from 'svelte';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="auth-shell">
	<PastedWordmark class="auth-shell__brand" />
	<section class="auth-shell__panel">
		{@render children()}
	</section>
	<p class="auth-shell__privacy">Private by default. Your imports stay yours.</p>
</main>

<style>
	.auth-shell {
		display: grid;
		min-height: 100vh;
		grid-template-rows: auto 1fr auto;
		padding: var(--page-gutter);
		background:
			linear-gradient(var(--border-subtle) 1px, transparent 1px),
			linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px), var(--surface-canvas);
		background-size: 4rem 4rem;
	}

	.auth-shell__panel {
		width: min(100%, 32rem);
		align-self: center;
		justify-self: center;
		border: var(--border-hairline) solid var(--border-default);
		background: var(--surface-canvas);
		padding: clamp(1.5rem, 5vw, 3.5rem);
	}

	.auth-shell__privacy {
		margin: var(--space-5) 0 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		text-align: center;
	}
</style>
