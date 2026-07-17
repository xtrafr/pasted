<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';

	type Props = {
		href?: Pathname;
		size?: 'small' | 'medium' | 'large';
		tone?: 'light' | 'dark';
		compact?: boolean;
		'aria-label'?: string;
		class?: string;
	};

	let {
		href,
		size = 'medium',
		tone = 'light',
		compact = false,
		'aria-label': ariaLabel,
		class: className = ''
	}: Props = $props();
</script>

{#if href}
	<a
		href={resolve(href)}
		aria-label={ariaLabel}
		class={`wordmark wordmark--${compact ? 'small' : size} wordmark--${tone} ${className}`}
	>
		<span class="wordmark__mark">Past</span>ed
	</a>
{:else}
	<span class={`wordmark wordmark--${compact ? 'small' : size} wordmark--${tone} ${className}`}>
		<span class="wordmark__mark">Past</span>ed
	</span>
{/if}

<style>
	.wordmark {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		justify-self: start;
		border-radius: var(--radius-button);
		color: var(--text-display);
		font-family: var(--font-ui);
		font-weight: var(--font-weight-medium);
		letter-spacing: -0.04em;
		line-height: 1;
		text-decoration: none;
		white-space: nowrap;
	}

	.wordmark--small {
		font-size: 1.125rem;
	}

	.wordmark--medium {
		font-size: 1.5rem;
	}

	.wordmark--large {
		font-size: 2.25rem;
	}

	.wordmark--dark {
		color: var(--text-inverse);
	}

	.wordmark--dark:focus-visible {
		outline-color: var(--focus-ring-inverse);
	}

	.wordmark__mark {
		position: relative;
	}

	.wordmark__mark::after {
		position: absolute;
		right: 0;
		bottom: -0.12em;
		left: 0;
		height: 2px;
		background: var(--surface-accent);
		content: '';
	}
</style>
