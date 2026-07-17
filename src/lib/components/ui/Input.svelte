<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'value' | 'size'> & {
		label: string;
		value?: string | number;
		description?: string;
		error?: string;
		hideLabel?: boolean;
		prefix?: Snippet;
		suffix?: Snippet;
	};

	const uid = $props.id();
	let {
		id = uid,
		label,
		value = $bindable(''),
		description,
		error,
		hideLabel = false,
		prefix,
		suffix,
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
		{#if prefix}<span class="field__adornment" aria-hidden="true">{@render prefix()}</span>{/if}
		<input
			{...rest}
			{id}
			{required}
			{disabled}
			bind:value
			aria-describedby={describedBy}
			aria-invalid={error ? 'true' : undefined}
		/>
		{#if suffix}<span class="field__adornment" aria-hidden="true">{@render suffix()}</span>{/if}
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
		color: var(--text-primary);
	}

	.field__control {
		display: flex;
		min-height: 3rem;
		align-items: center;
		gap: 0.625rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		transition:
			border-color var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-fast) var(--ease-out);
	}

	.field__control:focus-within {
		box-shadow: 0 0 0 3px var(--focus-ring);
	}

	.field[data-invalid='true'] .field__control {
		border-width: 2px;
		border-color: var(--color-press-black);
	}

	input {
		min-width: 0;
		min-height: 2.875rem;
		flex: 1;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--text-primary);
		padding: 0.75rem 0;
	}

	input:first-child {
		padding-left: 0.875rem;
	}

	input:last-child {
		padding-right: 0.875rem;
	}

	input::placeholder {
		color: var(--text-muted);
		opacity: 0.82;
	}

	input:disabled {
		opacity: 0.55;
	}

	.field__control:has(input:disabled) {
		opacity: 0.68;
	}

	.field__adornment {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		color: var(--text-muted);
	}

	.field__adornment:first-child {
		padding-left: 0.875rem;
	}

	.field__adornment:last-child {
		padding-right: 0.875rem;
	}
</style>
