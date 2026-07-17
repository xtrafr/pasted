<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type Props = Omit<HTMLSelectAttributes, 'value' | 'size'> & {
		label: string;
		value?: string | number;
		children?: Snippet;
		placeholder?: string;
		description?: string;
		error?: string;
		hideLabel?: boolean;
	};

	const uid = $props.id();
	let {
		id = uid,
		label,
		value = $bindable(''),
		children,
		placeholder,
		description,
		error,
		hideLabel = false,
		required = false,
		disabled = false,
		class: className = '',
		...rest
	}: Props = $props();

	const describedBy = $derived(
		[description ? `${id}-description` : '', error ? `${id}-error` : '']
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<div class={`field ${className}`} data-invalid={error ? 'true' : undefined}>
	<label class:sr-only={hideLabel} for={id}>
		{label}{#if required}<span aria-hidden="true"> *</span>{/if}
	</label>
	{#if description}
		<p class="field__description" id={`${id}-description`}>{description}</p>
	{/if}
	<div class="field__control">
		<select
			{...rest}
			{id}
			{required}
			{disabled}
			bind:value
			aria-describedby={describedBy}
			aria-invalid={error ? 'true' : undefined}
		>
			{#if placeholder}<option value="" disabled={required}>{placeholder}</option>{/if}
			{#if children}{@render children()}{/if}
		</select>
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" />
		</svg>
	</div>
	{#if error}
		<p class="field__error" id={`${id}-error`} aria-live="polite">{error}</p>
	{/if}
</div>

<style>
	.field {
		display: grid;
		gap: 0.5rem;
		width: 100%;
	}

	label {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		line-height: 1.2;
		text-transform: uppercase;
	}

	.field__description,
	.field__error {
		margin: 0;
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.field__description {
		color: var(--text-muted);
	}

	.field__error {
		font-weight: var(--font-weight-medium);
	}

	.field__control {
		position: relative;
	}

	select {
		width: 100%;
		min-height: 3rem;
		appearance: none;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		outline: 0;
		background: var(--surface-canvas);
		color: var(--text-primary);
		padding: 0.75rem 2.75rem 0.75rem 0.875rem;
		transition:
			border-color var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-fast) var(--ease-out);
	}

	select:focus {
		box-shadow: 0 0 0 3px var(--focus-ring);
	}

	.field[data-invalid='true'] select {
		border-width: 2px;
		border-color: var(--color-press-black);
	}

	select:disabled {
		opacity: 0.55;
	}

	svg {
		position: absolute;
		top: 50%;
		right: 0.875rem;
		pointer-events: none;
		transform: translateY(-50%);
	}
</style>
