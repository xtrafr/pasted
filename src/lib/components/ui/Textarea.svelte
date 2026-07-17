<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type Props = Omit<HTMLTextareaAttributes, 'value'> & {
		label: string;
		value?: string;
		description?: string;
		error?: string;
		hideLabel?: boolean;
		resize?: 'none' | 'vertical' | 'both';
	};

	const uid = $props.id();
	let {
		id = uid,
		label,
		value = $bindable(''),
		description,
		error,
		hideLabel = false,
		resize = 'vertical',
		rows = 5,
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
	<textarea
		{...rest}
		{id}
		{rows}
		{required}
		{disabled}
		bind:value
		aria-describedby={describedBy}
		aria-invalid={error ? 'true' : undefined}
		style={`resize: ${resize}`}></textarea>
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

	textarea {
		width: 100%;
		min-height: 7rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		outline: 0;
		background: var(--surface-canvas);
		color: var(--text-primary);
		line-height: var(--leading-body-compact);
		padding: 0.875rem;
		transition:
			border-color var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-fast) var(--ease-out);
	}

	textarea:focus {
		box-shadow: 0 0 0 3px var(--focus-ring);
	}

	.field[data-invalid='true'] textarea {
		border-width: 2px;
		border-color: var(--color-press-black);
	}

	textarea::placeholder {
		color: var(--text-muted);
		opacity: 0.82;
	}

	textarea:disabled {
		opacity: 0.55;
	}
</style>
