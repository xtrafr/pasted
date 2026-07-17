<script lang="ts">
	type Props = {
		value?: number;
		max?: number;
		label?: string;
		hideLabel?: boolean;
		showValue?: boolean;
		size?: 'small' | 'medium';
		class?: string;
	};

	const uid = $props.id();
	let {
		value,
		max = 100,
		label = 'Progress',
		hideLabel = false,
		showValue = false,
		size = 'medium',
		class: className = ''
	}: Props = $props();

	const percent = $derived(
		value === undefined || max <= 0
			? undefined
			: Math.round(Math.min(100, Math.max(0, (value / max) * 100)))
	);
</script>

<div class={`progress progress--${size} ${className}`}>
	<div class:sr-only={hideLabel} class="progress__meta">
		<span id={`${uid}-label`}>{label}</span>
		{#if showValue && percent !== undefined}<span>{percent}%</span>{/if}
	</div>
	<progress aria-labelledby={`${uid}-label`} {max} {value}>{percent ?? label}</progress>
</div>

<style>
	.progress {
		display: grid;
		gap: 0.5rem;
		width: 100%;
	}

	.progress__meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
		line-height: var(--leading-body-small);
	}

	progress {
		width: 100%;
		height: 0.625rem;
		appearance: none;
		border: 0;
		border-radius: var(--radius-full);
		background: var(--color-echo-green);
		overflow: hidden;
	}

	.progress--small progress {
		height: 0.25rem;
	}

	progress::-webkit-progress-bar {
		background: var(--color-echo-green);
	}

	progress::-webkit-progress-value {
		background: var(--surface-accent);
		transition: width var(--motion-standard) var(--ease-out);
	}

	progress::-moz-progress-bar {
		background: var(--surface-accent);
		transition: width var(--motion-standard) var(--ease-out);
	}

	progress:indeterminate {
		background: linear-gradient(
			90deg,
			var(--color-echo-green) 0 25%,
			var(--surface-accent) 25% 50%,
			var(--color-echo-green) 50% 100%
		);
		background-size: 200% 100%;
		animation: progress-slide 1.2s linear infinite;
	}

	@keyframes progress-slide {
		to {
			background-position: -200% 0;
		}
	}
</style>
