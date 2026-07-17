<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type ButtonVariant = 'primary' | 'outline' | 'quiet';
	type ButtonSize = 'small' | 'medium' | 'large';
	type ButtonTone = 'light' | 'dark';

	type Props = HTMLButtonAttributes & {
		children?: Snippet;
		variant?: ButtonVariant;
		size?: ButtonSize;
		tone?: ButtonTone;
		loading?: boolean;
		loadingLabel?: string;
		fullWidth?: boolean;
	};

	let {
		children,
		variant = 'primary',
		size = 'large',
		tone = 'light',
		loading = false,
		loadingLabel = 'Loading',
		fullWidth = false,
		disabled = false,
		type = 'button',
		class: className = '',
		...rest
	}: Props = $props();
</script>

<button
	{...rest}
	{type}
	disabled={disabled || loading}
	aria-busy={loading}
	data-loading={loading || undefined}
	class={`button button--${variant} button--${size} button--${tone}${fullWidth ? ' button--full' : ''} ${className}`}
>
	<span class:button__content--hidden={loading} class="button__content">
		{#if children}{@render children()}{/if}
	</span>
	{#if loading}
		<span class="button__loader" aria-hidden="true"></span>
		<span class="sr-only">{loadingLabel}</span>
	{/if}
</button>

<style>
	.button {
		position: relative;
		display: inline-flex;
		min-width: 2.75rem;
		min-height: 2.75rem;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		border: 1px solid transparent;
		border-radius: var(--radius-button);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		line-height: 1.1;
		text-align: center;
		text-transform: uppercase;
		transition:
			transform var(--motion-fast) var(--ease-out),
			background-color var(--motion-fast) var(--ease-out),
			border-color var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-standard) var(--ease-out),
			color var(--motion-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}

	.button:not(:disabled):active {
		transform: translateY(1px);
	}

	.button:disabled {
		opacity: 0.52;
	}

	.button--small {
		padding: 0.75rem 1rem;
	}

	.button--medium {
		padding: 1rem 1.5rem;
	}

	.button--large {
		padding: 1.25rem 1.875rem;
	}

	.button--full {
		width: 100%;
	}

	.button--primary {
		background: var(--surface-accent);
		box-shadow: var(--shadow-green);
		color: var(--color-typesetter-ink);
	}

	.button--primary:not(:disabled):hover {
		box-shadow: var(--shadow-green-soft);
		transform: translateY(-1px);
	}

	.button--outline {
		border-color: var(--border-default);
		background: transparent;
		color: var(--text-primary);
	}

	.button--outline.button--dark {
		border-color: var(--border-inverse);
		color: var(--text-inverse);
	}

	.button--outline:not(:disabled):hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.button--outline.button--dark:not(:disabled):hover {
		background: var(--color-bone-white);
		color: var(--text-primary);
	}

	.button--quiet {
		background: transparent;
		color: var(--text-primary);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}

	.button--quiet.button--dark {
		color: var(--text-inverse);
	}

	.button--quiet:not(:disabled):hover {
		text-underline-offset: 0.35em;
	}

	.button--dark:focus-visible {
		outline-color: var(--focus-ring-inverse);
	}

	.button__content {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: inherit;
	}

	.button__content--hidden {
		visibility: hidden;
	}

	.button__loader {
		position: absolute;
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: var(--radius-full);
		animation: button-spin 700ms linear infinite;
	}

	@keyframes button-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
