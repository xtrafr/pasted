<script lang="ts">
	type Props = {
		width?: string;
		height?: string;
		radius?: string;
		circle?: boolean;
		animated?: boolean;
		label?: string;
		announce?: boolean;
		class?: string;
	};

	let {
		width = '100%',
		height = '1rem',
		radius = 'var(--radius-button)',
		circle = false,
		animated = true,
		label = 'Loading content',
		announce = true,
		class: className = ''
	}: Props = $props();
</script>

<span class="skeleton-wrap" role={announce ? 'status' : undefined}>
	{#if announce}<span class="sr-only">{label}</span>{/if}
	<span
		class={`skeleton${animated ? ' skeleton--animated' : ''} ${className}`}
		aria-hidden="true"
		style={`--skeleton-width: ${width}; --skeleton-height: ${height}; --skeleton-radius: ${circle ? 'var(--radius-full)' : radius}`}
	></span>
</span>

<style>
	.skeleton-wrap,
	.skeleton {
		display: block;
	}

	.skeleton {
		width: var(--skeleton-width);
		height: var(--skeleton-height);
		border-radius: var(--skeleton-radius);
		background: var(--color-echo-green);
		overflow: hidden;
	}

	.skeleton--animated {
		background: linear-gradient(
			100deg,
			var(--color-echo-green) 20%,
			color-mix(in srgb, var(--color-muted-sage) 50%, var(--surface-canvas)) 40%,
			var(--color-echo-green) 60%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.5s ease-in-out infinite;
	}

	@keyframes skeleton-shimmer {
		to {
			background-position-x: -200%;
		}
	}
</style>
