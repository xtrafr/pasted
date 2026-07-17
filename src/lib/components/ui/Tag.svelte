<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children?: Snippet;
		text?: string;
		variant?: 'quiet' | 'outline' | 'accent';
		tone?: 'light' | 'dark';
		removeLabel?: string;
		onRemove?: () => void;
		class?: string;
	};

	let {
		children,
		text,
		variant = 'quiet',
		tone = 'light',
		removeLabel = text ? `Remove ${text}` : 'Remove tag',
		onRemove,
		class: className = ''
	}: Props = $props();
</script>

<span class={`tag tag--${variant} tag--${tone}${onRemove ? ' tag--removable' : ''} ${className}`}>
	<span class="tag__copy"
		>{#if children}{@render children()}{:else}{text}{/if}</span
	>
	{#if onRemove}
		<button type="button" aria-label={removeLabel} onclick={onRemove}>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path d="m3 3 10 10M13 3 3 13" fill="none" stroke="currentColor" stroke-width="1.5" />
			</svg>
		</button>
	{/if}
</span>

<style>
	.tag {
		display: inline-flex;
		min-height: 1.875rem;
		align-items: center;
		gap: 0.375rem;
		border: 1px solid transparent;
		border-radius: var(--radius-button);
		color: var(--text-muted);
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-book);
		letter-spacing: 0.01em;
		line-height: 1.1;
		text-transform: uppercase;
	}

	.tag--outline {
		border-color: var(--border-default);
		color: var(--text-primary);
		padding-left: 0.625rem;
	}

	.tag--accent {
		background: var(--surface-accent);
		color: var(--color-typesetter-ink);
		padding-left: 0.625rem;
	}

	.tag--dark.tag--quiet {
		color: var(--color-muted-sage);
	}

	.tag--dark.tag--outline {
		border-color: var(--border-inverse);
		color: var(--text-inverse);
	}

	.tag--removable {
		min-height: 2.75rem;
	}

	.tag__copy {
		padding: 0.35rem 0;
	}

	button {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		place-items: center;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
	}

	button:hover {
		background: rgb(18 22 19 / 12%);
	}
</style>
