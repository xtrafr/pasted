<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		eyebrow?: string;
		icon?: Snippet;
		children?: Snippet;
		actions?: Snippet;
		compact?: boolean;
		class?: string;
	};

	const uid = $props.id();
	let {
		title,
		description,
		eyebrow,
		icon,
		children,
		actions,
		compact = false,
		class: className = ''
	}: Props = $props();
</script>

<section
	class={`empty-state${compact ? ' empty-state--compact' : ''} ${className}`}
	aria-labelledby={`${uid}-title`}
	aria-describedby={description ? `${uid}-description` : undefined}
>
	{#if icon}<div class="empty-state__icon" aria-hidden="true">{@render icon()}</div>{/if}
	{#if eyebrow}<p class="empty-state__eyebrow">{eyebrow}</p>{/if}
	<h2 id={`${uid}-title`}>{title}</h2>
	{#if description}<p class="empty-state__description" id={`${uid}-description`}>
			{description}
		</p>{/if}
	{#if children}<div class="empty-state__body">{@render children()}</div>{/if}
	{#if actions}<div class="empty-state__actions">{@render actions()}</div>{/if}
</section>

<style>
	.empty-state {
		display: grid;
		width: 100%;
		min-height: 22rem;
		place-items: center;
		align-content: center;
		gap: 0.75rem;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: var(--radius-image);
		padding: clamp(2rem, 7vw, 5rem);
		text-align: center;
	}

	.empty-state--compact {
		min-height: 14rem;
		padding: 2rem;
	}

	.empty-state__icon {
		display: grid;
		width: 4rem;
		height: 4rem;
		place-items: center;
		margin-bottom: 0.5rem;
		border-radius: var(--radius-image);
		background: color-mix(in srgb, var(--surface-accent) 18%, var(--surface-canvas));
	}

	.empty-state__eyebrow {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	h2 {
		max-width: 18ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 7vw, 4.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	.empty-state__description,
	.empty-state__body {
		max-width: 48ch;
		color: var(--text-muted);
		font-size: var(--text-body-compact);
		line-height: var(--leading-body-compact);
	}

	.empty-state__description {
		margin: 0;
	}

	.empty-state__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
</style>
