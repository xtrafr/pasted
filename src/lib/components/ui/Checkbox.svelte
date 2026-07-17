<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'checked' | 'type'> & {
		label: string;
		checked?: boolean;
		indeterminate?: boolean;
		description?: string;
		error?: string;
	};

	const uid = $props.id();
	let {
		id = uid,
		label,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		description,
		error,
		disabled = false,
		required = false,
		class: className = '',
		...rest
	}: Props = $props();

	const describedBy = $derived(
		[description ? `${id}-description` : '', error ? `${id}-error` : '']
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<div class={`checkbox-field ${className}`}>
	<label class="checkbox" class:checkbox--disabled={disabled} for={id}>
		<span class="checkbox__control">
			<input
				{...rest}
				{id}
				type="checkbox"
				{disabled}
				{required}
				bind:checked
				bind:indeterminate
				aria-describedby={describedBy}
				aria-invalid={error ? 'true' : undefined}
			/>
			<svg class="checkbox__check" viewBox="0 0 16 16" aria-hidden="true">
				<path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
			</svg>
			<span class="checkbox__mixed" aria-hidden="true"></span>
		</span>
		<span class="checkbox__copy">
			<span class="checkbox__label">
				{label}{#if required}<span aria-hidden="true"> *</span>{/if}
			</span>
			{#if description}<span class="checkbox__description" id={`${id}-description`}
					>{description}</span
				>{/if}
		</span>
	</label>
	{#if error}
		<p class="checkbox__error" id={`${id}-error`} aria-live="polite">{error}</p>
	{/if}
</div>

<style>
	.checkbox-field {
		display: grid;
		gap: 0.375rem;
	}

	.checkbox {
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.75rem;
		width: fit-content;
		-webkit-tap-highlight-color: transparent;
	}

	.checkbox--disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.checkbox__control {
		position: relative;
		display: grid;
		width: 1.375rem;
		height: 1.375rem;
		flex: 0 0 auto;
		place-items: center;
	}

	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		appearance: none;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: 0.25rem;
		background: var(--surface-canvas);
		transition:
			background-color var(--motion-fast) var(--ease-out),
			border-color var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-fast) var(--ease-out);
	}

	input:checked,
	input:indeterminate {
		border-color: var(--color-press-black);
		background: var(--color-press-black);
	}

	input:focus-visible {
		outline: 0;
		box-shadow:
			0 0 0 3px var(--surface-canvas),
			0 0 0 6px var(--focus-ring);
	}

	.checkbox__check,
	.checkbox__mixed {
		position: relative;
		pointer-events: none;
		color: var(--text-inverse);
		opacity: 0;
	}

	.checkbox__check {
		width: 1rem;
		height: 1rem;
	}

	.checkbox__mixed {
		width: 0.75rem;
		height: 2px;
		background: currentColor;
	}

	input:checked ~ .checkbox__check,
	input:indeterminate ~ .checkbox__mixed {
		opacity: 1;
	}

	input:indeterminate ~ .checkbox__check {
		opacity: 0;
	}

	.checkbox__copy {
		display: grid;
		gap: 0.125rem;
	}

	.checkbox__label {
		font-size: var(--text-body-compact);
		font-weight: var(--font-weight-regular);
	}

	.checkbox__description,
	.checkbox__error {
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.checkbox__description {
		color: var(--text-muted);
	}

	.checkbox__error {
		margin: 0 0 0 2.125rem;
		font-weight: var(--font-weight-medium);
	}
</style>
