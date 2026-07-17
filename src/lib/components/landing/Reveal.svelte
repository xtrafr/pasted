<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		delay?: number;
		class?: string;
	};

	let { children, delay = 0, class: className = '' }: Props = $props();
	let element: HTMLDivElement;
	let enhanced = $state(false);
	let revealed = $state(true);

	onMount(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion || !('IntersectionObserver' in window)) return;

		enhanced = true;
		const rect = element.getBoundingClientRect();
		revealed = rect.top < window.innerHeight * 0.92;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0]?.isIntersecting) return;
				revealed = true;
				observer.disconnect();
			},
			{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
		);
		if (!revealed) observer.observe(element);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={element}
	class={`reveal ${className}`}
	class:reveal--waiting={enhanced && !revealed}
	style={`--reveal-delay: ${delay}ms`}
>
	{@render children()}
</div>

<style>
	.reveal {
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 600ms var(--ease-out) var(--reveal-delay),
			transform 600ms var(--ease-out) var(--reveal-delay);
	}

	.reveal--waiting {
		opacity: 0;
		transform: translateY(1.25rem);
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal,
		.reveal--waiting {
			opacity: 1;
			transform: none;
		}
	}
</style>
