<script lang="ts">
	import { resolve } from '$app/paths';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import AppIcon from './AppIcon.svelte';

	let { open = $bindable(false), onQuickAdd }: { open?: boolean; onQuickAdd: () => void } =
		$props();

	let query = $state('');
	const appPath = resolve('/app');
	const commands = [
		{ label: 'Show every item', hint: 'G then A', href: appPath, icon: 'all' as const },
		{
			label: 'Open favorites',
			hint: 'G then F',
			href: `${appPath}?view=favorites`,
			icon: 'star' as const
		},
		{
			label: 'Open reminders',
			hint: 'G then R',
			href: `${appPath}?view=reminders`,
			icon: 'bell' as const
		},
		{ label: 'Import a file', hint: 'I', href: resolve('/app/import'), icon: 'import' as const },
		{ label: 'Export library', hint: 'E', href: resolve('/app/export'), icon: 'bookmark' as const }
	];
	const filtered = $derived(
		commands.filter((command) => command.label.toLowerCase().includes(query.trim().toLowerCase()))
	);

	function navigate(href: string) {
		open = false;
		query = '';
		window.location.assign(href);
	}

	function quickAdd() {
		open = false;
		query = '';
		onQuickAdd();
	}
</script>

<Dialog bind:open title="Go somewhere" description="Search Pasted actions and views.">
	<label class="command-search">
		<span class="sr-only">Search commands</span>
		<AppIcon name="search" />
		<input bind:value={query} placeholder="Type a command" autocomplete="off" />
	</label>
	<div class="commands" role="listbox" aria-label="Commands">
		<button type="button" role="option" aria-selected="false" onclick={quickAdd}>
			<AppIcon name="plus" /><span>Save something new</span><kbd>N</kbd>
		</button>
		{#each filtered as command (command.href)}
			<button
				type="button"
				role="option"
				aria-selected="false"
				onclick={() => navigate(command.href)}
			>
				<AppIcon name={command.icon} /><span>{command.label}</span><kbd>{command.hint}</kbd>
			</button>
		{/each}
		{#if filtered.length === 0}
			<p>No matching command. Press Escape to close.</p>
		{/if}
	</div>
</Dialog>

<style>
	.command-search {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: var(--border-hairline) solid var(--border-default);
		padding: 0 0.5rem 1rem;
	}

	.command-search input {
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 1.1rem;
		outline: 0;
	}

	.commands {
		display: grid;
		gap: 0.3rem;
		padding-top: 0.75rem;
	}

	.commands button {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		min-height: 3.25rem;
		align-items: center;
		gap: 0.85rem;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		padding: 0.65rem 0.75rem;
		text-align: left;
	}

	.commands button:hover,
	.commands button:focus-visible {
		background: var(--surface-accent);
	}

	kbd {
		border: var(--border-hairline) solid var(--border-default);
		border-radius: 0.3rem;
		padding: 0.2rem 0.4rem;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.66rem;
	}

	.commands p {
		margin: 1rem 0;
		color: var(--text-muted);
		text-align: center;
	}
</style>
