<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import SharedItem from './SharedItem.svelte';

	let { data }: PageProps = $props();
	const shared = $derived(data.shared);

	function dateLabel(value: Date): string {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value);
	}
</script>

<svelte:head>
	<title
		>{shared.kind === 'collection' ? shared.collection.name : (shared.item.title ?? 'Shared item')} |
		Pasted</title
	>
	<meta name="description" content="A private page shared with Pasted" />
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<main>
	<nav aria-label="Pasted">
		<a class="wordmark" href={resolve('/')} referrerpolicy="no-referrer">Past<span>ed</span></a>
		<span>Read-only share</span>
	</nav>

	<section class="intro">
		<p class="eyebrow">Shared from Pasted</p>
		{#if shared.kind === 'collection'}
			<h1>{shared.collection.name}</h1>
			{#if shared.collection.description}<p>{shared.collection.description}</p>{/if}
			<p class="details">
				{shared.collection.items.length}
				{shared.collection.items.length === 1 ? 'item' : 'items'}
				{#if shared.expiresAt}
					| Expires {dateLabel(shared.expiresAt)}{/if}
			</p>
		{:else}
			<h1>
				{shared.item.title ??
					(shared.item.type === 'link' ? shared.item.link?.metadataTitle : null) ??
					'Shared item'}
			</h1>
			<p class="details">
				{shared.item.type}
				{#if shared.expiresAt}
					| Expires {dateLabel(shared.expiresAt)}{/if}
			</p>
		{/if}
	</section>

	{#if shared.kind === 'collection'}
		<section class="items" aria-label="Shared collection items">
			{#each shared.collection.items as item (`${item.type}:${item.createdAt.toISOString()}:${item.title ?? ''}`)}
				<SharedItem {item} />
			{:else}
				<p class="empty">This collection is empty.</p>
			{/each}
			{#if shared.collection.truncated}
				<p class="notice">This large collection is showing its first 500 items.</p>
			{/if}
		</section>
	{:else}
		<section class="items single" aria-label="Shared item">
			<SharedItem item={shared.item} />
		</section>
	{/if}

	<footer>
		<span>Private by default.</span>
		<a href={resolve('/')} referrerpolicy="no-referrer">Learn about Pasted</a>
	</footer>
</main>

<style>
	:global(body) {
		background: var(--color-canvas, #fafffa);
		color: var(--color-ink, #121613);
	}

	main {
		width: min(100% - 2rem, 64rem);
		margin-inline: auto;
		padding-bottom: 3rem;
	}

	nav,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 4.5rem;
		border-bottom: 1px solid var(--color-border, #232924);
		font-size: 0.75rem;
		text-transform: uppercase;
	}

	.wordmark {
		position: relative;
		color: inherit;
		font-size: 1.25rem;
		font-weight: 750;
		letter-spacing: -0.04em;
		text-decoration: none;
		text-transform: none;
	}

	.wordmark::after {
		position: absolute;
		bottom: -0.15rem;
		left: 0;
		width: 2.25rem;
		height: 0.15rem;
		background: var(--color-accent, #2bee4b);
		content: '';
	}

	.intro {
		display: grid;
		gap: 1rem;
		padding-block: clamp(3rem, 9vw, 7rem);
	}

	.eyebrow,
	.details,
	.intro > p,
	h1 {
		margin: 0;
	}

	.eyebrow,
	.details {
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 17ch;
		font-family: var(--font-display, Georgia, serif);
		font-size: clamp(2.75rem, 10vw, 6.75rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 0.92;
	}

	.intro > p:not(.eyebrow, .details) {
		max-width: 44rem;
		font-size: 1.125rem;
		line-height: 1.5;
	}

	.items {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.items.single {
		grid-template-columns: minmax(0, 48rem);
	}

	.empty,
	.notice {
		grid-column: 1 / -1;
		padding: 2rem;
		border: 1px solid var(--color-border, #232924);
	}

	footer {
		margin-top: 5rem;
		border-top: 1px solid var(--color-border, #232924);
		border-bottom: 0;
	}

	footer a {
		color: inherit;
		font-weight: 650;
	}

	@media (max-width: 48rem) {
		.items {
			grid-template-columns: 1fr;
		}

		nav,
		footer {
			align-items: flex-start;
			flex-direction: column;
			justify-content: center;
		}
	}
</style>
