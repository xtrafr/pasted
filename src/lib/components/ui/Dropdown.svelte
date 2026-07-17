<script lang="ts">
	import { tick, type Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		trigger?: Snippet<[open: boolean]>;
		children?: Snippet;
		label?: string;
		align?: 'start' | 'end';
		disabled?: boolean;
		onOpenChange?: (open: boolean) => void;
		class?: string;
	};

	const uid = $props.id();
	let {
		open = $bindable(false),
		trigger,
		children,
		label = 'Open menu',
		align = 'start',
		disabled = false,
		onOpenChange,
		class: className = ''
	}: Props = $props();

	let root: HTMLDivElement;
	let triggerButton: HTMLButtonElement;
	let menu = $state<HTMLDivElement>();

	function items() {
		return Array.from(
			menu?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []
		).filter((item) => !item.hasAttribute('disabled'));
	}

	function setOpen(next: boolean, focus: 'first' | 'last' | 'none' = 'none') {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
		if (next && focus !== 'none') {
			void tick().then(() => {
				const available = items();
				available[focus === 'first' ? 0 : available.length - 1]?.focus();
			});
		}
	}

	function handleTriggerClick() {
		if (open) setOpen(false);
		else setOpen(true, 'first');
	}

	function handleTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setOpen(true, 'first');
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setOpen(true, 'last');
		}
	}

	function handleMenuKeydown(event: KeyboardEvent) {
		const available = items();
		const current = available.indexOf(document.activeElement as HTMLElement);
		if (event.key === 'Escape') {
			event.preventDefault();
			setOpen(false);
			triggerButton.focus();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			available[(current + 1 + available.length) % available.length]?.focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			available[(current - 1 + available.length) % available.length]?.focus();
		} else if (event.key === 'Home') {
			event.preventDefault();
			available[0]?.focus();
		} else if (event.key === 'End') {
			event.preventDefault();
			available.at(-1)?.focus();
		} else if (event.key === 'Tab') {
			setOpen(false);
		}
	}

	function handleMenuClick(event: MouseEvent) {
		if ((event.target as HTMLElement).closest('[role="menuitem"]')) setOpen(false);
	}

	function handleWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) setOpen(false);
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div bind:this={root} class={`dropdown ${className}`}>
	<button
		bind:this={triggerButton}
		type="button"
		class="dropdown__trigger"
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls={`${uid}-menu`}
		{disabled}
		onclick={handleTriggerClick}
		onkeydown={handleTriggerKeydown}
	>
		{#if trigger}{@render trigger(open)}{:else}Menu{/if}
		<svg
			class:dropdown__chevron--open={open}
			viewBox="0 0 16 16"
			width="16"
			height="16"
			aria-hidden="true"
		>
			<path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" />
		</svg>
	</button>
	{#if open}
		<div
			bind:this={menu}
			id={`${uid}-menu`}
			class={`dropdown__menu dropdown__menu--${align}`}
			role="menu"
			tabindex="-1"
			onkeydown={handleMenuKeydown}
			onclick={handleMenuClick}
		>
			{#if children}{@render children()}{/if}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: inline-block;
	}

	.dropdown__trigger {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--text-primary);
		padding: 0.75rem 1rem;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.dropdown__trigger:hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.dropdown__trigger:disabled {
		opacity: 0.52;
	}

	.dropdown__trigger svg {
		transition: transform var(--motion-fast) var(--ease-out);
	}

	.dropdown__chevron--open {
		transform: rotate(180deg);
	}

	.dropdown__menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		z-index: 40;
		display: grid;
		width: max-content;
		min-width: 13rem;
		max-width: min(22rem, calc(100vw - 2rem));
		gap: 0.25rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		padding: 0.5rem;
		animation: dropdown-in var(--motion-fast) var(--ease-out);
	}

	.dropdown__menu--start {
		left: 0;
	}

	.dropdown__menu--end {
		right: 0;
	}

	.dropdown__menu :global([role='menuitem']) {
		display: flex;
		width: 100%;
		min-height: 2.75rem;
		align-items: center;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: var(--text-primary);
		padding: 0.625rem 0.75rem;
		text-align: left;
		text-decoration: none;
	}

	.dropdown__menu :global([role='menuitem']:hover),
	.dropdown__menu :global([role='menuitem']:focus-visible) {
		background: var(--surface-accent);
		color: var(--color-typesetter-ink);
	}

	@keyframes dropdown-in {
		from {
			opacity: 0;
			transform: translateY(-0.25rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
