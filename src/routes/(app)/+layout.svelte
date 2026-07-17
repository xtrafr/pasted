<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import type { Snippet } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppIcon from '$lib/components/app/AppIcon.svelte';
	import CommandPalette from '$lib/components/app/CommandPalette.svelte';
	import QuickAdd from '$lib/components/app/QuickAdd.svelte';
	import type { LibraryCollection, LibraryTag } from '$lib/components/app/types';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authClient } from '$lib/auth-client';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let signingOut = $state(false);
	let quickAddOpen = $state(false);
	let commandOpen = $state(false);
	let shortcutPrefix = '';
	let shortcutTimer: ReturnType<typeof setTimeout> | undefined;
	const collections = $derived(data.collections as LibraryCollection[]);
	const tags = $derived(data.tags as LibraryTag[]);

	async function signOut() {
		signingOut = true;
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/'));
	}

	function isTyping(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		);
	}

	function navigate(href: string) {
		void goto(href);
	}

	function handleShortcut(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			commandOpen = true;
			return;
		}
		if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;

		if (event.key === '/') {
			const search = document.querySelector<HTMLInputElement>('#library-search');
			if (search) {
				event.preventDefault();
				search.focus();
			}
			return;
		}
		if (event.key.toLowerCase() === 'n') {
			event.preventDefault();
			quickAddOpen = true;
			return;
		}
		if (event.key.toLowerCase() === 'i') {
			event.preventDefault();
			navigate(resolve('/app/import'));
			return;
		}
		if (event.key.toLowerCase() === 'e') {
			event.preventDefault();
			navigate(resolve('/app/export'));
			return;
		}
		if (shortcutPrefix === 'g') {
			const destinations: Record<string, string> = {
				a: resolve('/app'),
				f: `${resolve('/app')}?view=favorites`,
				r: `${resolve('/app')}?view=reminders`,
				o: resolve('/app/settings/organization')
			};
			const destination = destinations[event.key.toLowerCase()];
			shortcutPrefix = '';
			if (destination) {
				event.preventDefault();
				navigate(destination);
			}
			return;
		}
		if (event.key.toLowerCase() === 'g') {
			shortcutPrefix = 'g';
			if (shortcutTimer) clearTimeout(shortcutTimer);
			shortcutTimer = setTimeout(() => (shortcutPrefix = ''), 900);
		}
	}
</script>

<svelte:window onkeydown={handleShortcut} />

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-frame">
	<a class="skip-link" href="#app-main-content">Skip to main content</a>
	<header class="app-frame__header">
		<PastedWordmark href="/app" size="small" aria-label="Pasted dashboard" />
		<div class="app-frame__tools">
			<button
				class="app-frame__command"
				type="button"
				aria-label="Open command palette"
				onclick={() => (commandOpen = true)}
			>
				<AppIcon name="search" size={17} />
				<span>Commands</span>
				<kbd>Ctrl K</kbd>
			</button>
			<Button
				id="global-quick-add"
				class="app-frame__quick"
				size="small"
				onclick={() => (quickAddOpen = true)}
			>
				<AppIcon name="plus" size={18} /> <span class="quick-add-label">Quick add</span>
			</Button>
			<div class="app-frame__account">
				<span>{data.user.email}</span>
				<Button variant="quiet" size="small" onclick={signOut} loading={signingOut}>Sign out</Button
				>
			</div>
		</div>
	</header>
	<div id="app-main-content" tabindex="-1">{@render children()}</div>
</div>

<QuickAdd bind:open={quickAddOpen} {collections} {tags} />
<CommandPalette bind:open={commandOpen} onQuickAdd={() => (quickAddOpen = true)} />

<style>
	.app-frame {
		min-height: 100vh;
	}

	.skip-link {
		position: fixed;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 200;
		transform: translateY(-150%);
		border-radius: var(--radius-button);
		background: var(--color-press-black);
		color: var(--text-inverse);
		padding: 0.75rem 1rem;
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	.app-frame__header {
		display: flex;
		min-height: 4.5rem;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		border-bottom: var(--border-hairline) solid var(--border-default);
		padding: var(--space-3-75) var(--page-gutter);
	}

	.app-frame__account {
		display: flex;
		align-items: center;
		gap: var(--space-3-75);
		font-size: var(--text-body-small);
	}

	.app-frame__tools,
	.app-frame__command {
		display: flex;
		align-items: center;
	}

	.app-frame__tools {
		gap: 0.65rem;
	}

	.app-frame__command {
		min-height: 2.75rem;
		gap: 0.55rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		padding: 0.65rem 0.8rem;
	}

	.app-frame__command kbd {
		border-radius: 0.25rem;
		background: var(--surface-subtle);
		padding: 0.18rem 0.35rem;
		font: inherit;
		font-size: 0.62rem;
	}

	@media (max-width: 40rem) {
		.app-frame__header {
			gap: var(--space-2);
		}

		.app-frame__tools {
			gap: var(--space-1);
		}

		.app-frame__account > span,
		.app-frame__command span,
		.app-frame__command kbd,
		.quick-add-label {
			display: none;
		}

		.app-frame__command {
			width: 2.75rem;
			justify-content: center;
			padding: 0;
		}
	}
</style>
