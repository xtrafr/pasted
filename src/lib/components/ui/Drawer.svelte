<script lang="ts">
	import type { Snippet } from 'svelte';

	type DrawerSide = 'left' | 'right' | 'bottom';

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		footer?: Snippet;
		side?: DrawerSide;
		dismissible?: boolean;
		closeLabel?: string;
		onOpenChange?: (open: boolean) => void;
		class?: string;
	};

	const uid = $props.id();
	let {
		open = $bindable(false),
		title,
		description,
		children,
		footer,
		side = 'right',
		dismissible = true,
		closeLabel = 'Close panel',
		onOpenChange,
		class: className = ''
	}: Props = $props();

	let drawer: HTMLDialogElement;

	function setOpen(next: boolean) {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
	}

	function handleCancel(event: Event) {
		event.preventDefault();
		if (dismissible) setOpen(false);
	}

	function handleClose() {
		if (open) setOpen(false);
	}

	function handleBackdropClick(event: MouseEvent) {
		if (dismissible && event.target === drawer) setOpen(false);
	}

	$effect(() => {
		if (!drawer) return;
		if (open && !drawer.open) drawer.showModal();
		if (!open && drawer.open) drawer.close();
	});
</script>

<dialog
	bind:this={drawer}
	class={`drawer drawer--${side} ${className}`}
	aria-labelledby={`${uid}-title`}
	aria-describedby={description ? `${uid}-description` : undefined}
	oncancel={handleCancel}
	onclose={handleClose}
	onclick={handleBackdropClick}
>
	<div class="drawer__panel">
		<header class="drawer__header">
			<div>
				<h2 id={`${uid}-title`}>{title}</h2>
				{#if description}<p id={`${uid}-description`}>{description}</p>{/if}
			</div>
			{#if dismissible}
				<button
					class="drawer__close"
					type="button"
					aria-label={closeLabel}
					onclick={() => setOpen(false)}
				>
					<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
						<path d="m4 4 12 12M16 4 4 16" fill="none" stroke="currentColor" stroke-width="1.5" />
					</svg>
				</button>
			{/if}
		</header>
		<div class="drawer__body">
			{#if children}{@render children()}{/if}
		</div>
		{#if footer}<footer class="drawer__footer">{@render footer()}</footer>{/if}
	</div>
</dialog>

<style>
	.drawer {
		position: fixed;
		width: min(30rem, calc(100vw - 1rem));
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: var(--surface-canvas);
		color: var(--text-primary);
		overflow: hidden;
	}

	.drawer--right {
		inset: 0 0 0 auto;
		border-left: var(--border-hairline) solid var(--border-default);
	}

	.drawer--left {
		inset: 0 auto 0 0;
		border-right: var(--border-hairline) solid var(--border-default);
	}

	.drawer--bottom {
		inset: auto 0 0;
		width: 100vw;
		height: min(34rem, calc(100dvh - 2rem));
		border-top: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image) var(--radius-image) 0 0;
	}

	.drawer[open].drawer--right {
		animation: drawer-right-in var(--motion-standard) var(--ease-out);
	}

	.drawer[open].drawer--left {
		animation: drawer-left-in var(--motion-standard) var(--ease-out);
	}

	.drawer[open].drawer--bottom {
		animation: drawer-bottom-in var(--motion-standard) var(--ease-out);
	}

	.drawer::backdrop {
		background: rgb(18 22 19 / 72%);
		backdrop-filter: grayscale(1);
	}

	.drawer__panel {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		height: 100%;
	}

	.drawer__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.25rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 1.5rem;
	}

	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 6vw, 3.75rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	p {
		max-width: 40ch;
		margin: 0.75rem 0 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.drawer__close {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: transparent;
		color: inherit;
	}

	.drawer__close:hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.drawer__body {
		overflow: auto;
		padding: 1.5rem;
	}

	.drawer__footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.75rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem 1.5rem 1.5rem;
	}

	@keyframes drawer-right-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@keyframes drawer-left-in {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@keyframes drawer-bottom-in {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
