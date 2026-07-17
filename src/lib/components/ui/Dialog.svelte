<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		footer?: Snippet;
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
		dismissible = true,
		closeLabel = 'Close dialog',
		onOpenChange,
		class: className = ''
	}: Props = $props();

	let dialog: HTMLDialogElement;

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
		if (!dismissible || event.target !== dialog) return;
		const rect = dialog.getBoundingClientRect();
		const inside =
			event.clientX >= rect.left &&
			event.clientX <= rect.right &&
			event.clientY >= rect.top &&
			event.clientY <= rect.bottom;
		if (!inside) setOpen(false);
	}

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	class={`dialog ${className}`}
	aria-labelledby={`${uid}-title`}
	aria-describedby={description ? `${uid}-description` : undefined}
	oncancel={handleCancel}
	onclose={handleClose}
	onclick={handleBackdropClick}
>
	<div class="dialog__panel">
		<header class="dialog__header">
			<div>
				<h2 id={`${uid}-title`}>{title}</h2>
				{#if description}<p id={`${uid}-description`}>{description}</p>{/if}
			</div>
			{#if dismissible}
				<button
					class="dialog__close"
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
		<div class="dialog__body">
			{#if children}{@render children()}{/if}
		</div>
		{#if footer}<footer class="dialog__footer">{@render footer()}</footer>{/if}
	</div>
</dialog>

<style>
	.dialog {
		width: min(38rem, calc(100vw - 2rem));
		max-width: none;
		max-height: min(48rem, calc(100dvh - 2rem));
		padding: 0;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-canvas);
		box-shadow: none;
		color: var(--text-primary);
		overflow: hidden;
	}

	.dialog[open] {
		animation: dialog-in var(--motion-standard) var(--ease-out);
	}

	.dialog::backdrop {
		background: rgb(18 22 19 / 72%);
		backdrop-filter: grayscale(1);
	}

	.dialog__panel {
		display: grid;
		max-height: inherit;
	}

	.dialog__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 1.5rem 1.5rem 1rem;
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
		max-width: 44ch;
		margin: 0.75rem 0 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.dialog__close {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: transparent;
		color: inherit;
		transition:
			background-color var(--motion-fast) var(--ease-out),
			color var(--motion-fast) var(--ease-out);
	}

	.dialog__close:hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.dialog__body {
		min-height: 0;
		overflow: auto;
		padding: 1rem 1.5rem 1.5rem;
	}

	.dialog__footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.75rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem 1.5rem 1.5rem;
	}

	@keyframes dialog-in {
		from {
			opacity: 0;
			transform: translateY(0.75rem) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
