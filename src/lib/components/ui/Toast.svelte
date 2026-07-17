<script lang="ts">
	import type { FocusEventHandler } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type ToastTone = 'info' | 'success' | 'warning';
	type ToastPlacement = 'top-right' | 'bottom-right' | 'bottom-left';

	type Props = {
		open?: boolean;
		title?: string;
		message: string;
		action?: Snippet;
		tone?: ToastTone;
		placement?: ToastPlacement;
		duration?: number;
		assertive?: boolean;
		dismissLabel?: string;
		onOpenChange?: (open: boolean) => void;
		class?: string;
	};

	let {
		open = $bindable(false),
		title,
		message,
		action,
		tone = 'info',
		placement = 'bottom-right',
		duration = 5000,
		assertive = false,
		dismissLabel = 'Dismiss notification',
		onOpenChange,
		class: className = ''
	}: Props = $props();

	let paused = $state(false);

	function setOpen(next: boolean) {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
	}

	const handleFocusOut: FocusEventHandler<HTMLElement> = (event) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) paused = false;
	};

	$effect(() => {
		if (!open || paused || duration <= 0) return;
		const timer = setTimeout(() => setOpen(false), duration);
		return () => clearTimeout(timer);
	});
</script>

{#if open}
	<aside
		class={`toast toast--${tone} toast--${placement} ${className}`}
		role={assertive ? 'alert' : 'status'}
		aria-live={assertive ? 'assertive' : 'polite'}
		onmouseenter={() => (paused = true)}
		onmouseleave={() => (paused = false)}
		onfocusin={() => (paused = true)}
		onfocusout={handleFocusOut}
	>
		<span class="toast__mark" aria-hidden="true"></span>
		<div class="toast__copy">
			{#if title}<strong>{title}</strong>{/if}
			<p>{message}</p>
			{#if action}<div class="toast__action">{@render action()}</div>{/if}
		</div>
		<button
			class="toast__close"
			type="button"
			aria-label={dismissLabel}
			onclick={() => setOpen(false)}
		>
			<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
				<path d="m4 4 12 12M16 4 4 16" fill="none" stroke="currentColor" stroke-width="1.5" />
			</svg>
		</button>
	</aside>
{/if}

<style>
	.toast {
		position: fixed;
		z-index: 80;
		display: grid;
		grid-template-columns: 0.25rem minmax(0, 1fr) auto;
		width: min(26rem, calc(100vw - 2rem));
		gap: 0.875rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: var(--text-primary);
		padding: 1rem;
		animation: toast-in var(--motion-standard) var(--ease-out);
	}

	.toast--top-right {
		top: 1rem;
		right: 1rem;
	}

	.toast--bottom-right {
		right: 1rem;
		bottom: 1rem;
	}

	.toast--bottom-left {
		bottom: 1rem;
		left: 1rem;
	}

	.toast__mark {
		width: 0.25rem;
		height: 100%;
		min-height: 2.75rem;
		background: var(--color-press-black);
	}

	.toast--success .toast__mark {
		background: var(--surface-accent);
	}

	.toast--warning .toast__mark {
		background: var(--color-newsprint-gray);
	}

	.toast__copy {
		display: grid;
		align-content: center;
		gap: 0.25rem;
	}

	strong {
		font-size: var(--text-body-compact);
		font-weight: var(--font-weight-medium);
	}

	p {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.toast__action {
		margin-top: 0.5rem;
	}

	.toast__close {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		place-items: center;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
	}

	.toast__close:hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(0.75rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
