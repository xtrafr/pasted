<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		content: string;
		label?: string;
		placement?: 'top' | 'right' | 'bottom' | 'left';
		delay?: number;
		disabled?: boolean;
		class?: string;
	};

	const uid = $props.id();
	let {
		children,
		content,
		label,
		placement = 'top',
		delay = 350,
		disabled = false,
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function show() {
		if (disabled) return;
		clearTimeout(timer);
		timer = setTimeout(() => (open = true), delay);
	}

	function hide() {
		clearTimeout(timer);
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') hide();
	}

	onDestroy(() => clearTimeout(timer));
</script>

<span class={`tooltip ${className}`}>
	<button
		type="button"
		class="tooltip__trigger"
		aria-label={label}
		aria-describedby={uid}
		{disabled}
		onmouseenter={show}
		onmouseleave={hide}
		onfocus={show}
		onblur={hide}
		onclick={() => (open ? hide() : show())}
		onkeydown={handleKeydown}
	>
		{@render children()}
	</button>
	<span
		id={uid}
		class={`tooltip__bubble tooltip__bubble--${placement}`}
		role="tooltip"
		hidden={!open}
	>
		{content}
	</span>
</span>

<style>
	.tooltip {
		position: relative;
		display: inline-flex;
	}

	.tooltip__trigger {
		display: inline-flex;
		min-width: 2.75rem;
		min-height: 2.75rem;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		padding: 0;
	}

	.tooltip__trigger:hover {
		background: color-mix(in srgb, var(--color-echo-green) 45%, transparent);
	}

	.tooltip__bubble {
		position: absolute;
		z-index: 60;
		width: max-content;
		max-width: min(18rem, calc(100vw - 2rem));
		border-radius: var(--radius-button);
		background: var(--surface-dark);
		color: var(--text-inverse);
		padding: 0.5rem 0.625rem;
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
		pointer-events: none;
		animation: tooltip-in var(--motion-fast) var(--ease-out);
	}

	.tooltip__bubble--top {
		bottom: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip__bubble--bottom {
		top: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip__bubble--left {
		top: 50%;
		right: calc(100% + 0.5rem);
		transform: translateY(-50%);
	}

	.tooltip__bubble--right {
		top: 50%;
		left: calc(100% + 0.5rem);
		transform: translateY(-50%);
	}

	@keyframes tooltip-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
