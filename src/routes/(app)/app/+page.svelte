<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { navigating } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import AppIcon from '$lib/components/app/AppIcon.svelte';
	import CommandPalette from '$lib/components/app/CommandPalette.svelte';
	import ItemCard from '$lib/components/app/ItemCard.svelte';
	import LibrarySidebar from '$lib/components/app/LibrarySidebar.svelte';
	import QuickAdd from '$lib/components/app/QuickAdd.svelte';
	import type { LibraryCollection, LibraryItem, LibraryTag } from '$lib/components/app/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let quickAddOpen = $state(false);
	let commandOpen = $state(false);
	let sidebarOpen = $state(false);
	let collectionOpen = $state(false);
	let tagOpen = $state(false);
	let toastOpen = $state(false);
	let viewMode = $state<'grid' | 'list'>('grid');
	const selected = new SvelteSet<string>();
	let searchForm: HTMLFormElement;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let shortcutPrefix = '';
	let shortcutTimer: ReturnType<typeof setTimeout> | undefined;
	const skeletonSlots = [0, 1, 2, 3, 4, 5];

	const items = $derived(data.library.items as LibraryItem[]);
	const collections = $derived(data.collections as LibraryCollection[]);
	const tags = $derived(data.tags as LibraryTag[]);
	const allSelected = $derived(items.length > 0 && selected.size === items.length);
	const viewTitle = $derived(
		data.filters.collection
			? data.filters.collection === 'unorganized'
				? 'Unorganized'
				: (collections.find((entry) => entry.id === data.filters.collection)?.name ?? 'Collection')
			: data.filters.view === 'favorites'
				? 'Favorites'
				: data.filters.view === 'reminders'
					? 'Reminders'
					: data.filters.view === 'archived'
						? 'Archive'
						: 'Everything'
	);
	const actionMessage = $derived(
		form?.success
			? form.kind === 'bulk'
				? `${form.affected} items updated.`
				: `${form.kind[0]?.toUpperCase()}${form.kind.slice(1)} saved.`
			: (form?.message ?? 'The operation could not be completed.')
	);

	$effect(() => {
		const stored = localStorage.getItem('pasted-view-mode');
		if (stored === 'list' || stored === 'grid') viewMode = stored;
	});

	$effect(() => {
		if (form) toastOpen = true;
	});

	function setViewMode(mode: 'grid' | 'list') {
		viewMode = mode;
		localStorage.setItem('pasted-view-mode', mode);
	}

	function toggleItem(id: string, value: boolean) {
		if (value) selected.add(id);
		else selected.delete(id);
	}

	function toggleAll() {
		if (allSelected) selected.clear();
		else items.forEach((item) => selected.add(item.id));
	}

	function debounceSearch() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => searchForm.requestSubmit(), 320);
	}

	function confirmBulk(event: SubmitEvent) {
		const formElement = event.currentTarget as HTMLFormElement;
		const action = new FormData(formElement).get('bulkAction');
		if (action === 'delete' && !confirm(`Delete ${selected.size} selected items?`)) {
			event.preventDefault();
		}
	}

	async function enableNotifications() {
		if (!('Notification' in window)) return;
		await Notification.requestPermission();
	}

	function isTyping(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement
		);
	}

	function handleShortcut(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			selected.clear();
			return;
		}
		if (isTyping(event.target)) return;
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			commandOpen = true;
			return;
		}
		if (event.key === '/') {
			event.preventDefault();
			document.querySelector<HTMLInputElement>('#library-search')?.focus();
			return;
		}
		if (event.key.toLowerCase() === 'n') {
			quickAddOpen = true;
			return;
		}
		if (event.key.toLowerCase() === 'i') {
			window.location.href = resolve('/app/import');
			return;
		}
		if (shortcutPrefix === 'g') {
			const destinations: Record<string, string> = {
				a: resolve('/app'),
				f: `${resolve('/app')}?view=favorites`,
				r: `${resolve('/app')}?view=reminders`
			};
			const destination = destinations[event.key.toLowerCase()];
			shortcutPrefix = '';
			if (destination) window.location.href = destination;
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
	<title>{viewTitle} | Pasted</title>
	<meta name="description" content="Your private Pasted library of links, notes, and reminders." />
</svelte:head>

<div class="dashboard-shell">
	<LibrarySidebar
		{collections}
		activeView={data.filters.view}
		activeCollection={data.filters.collection}
		open={sidebarOpen}
		onClose={() => (sidebarOpen = false)}
	/>

	<main class="library-main">
		<header class="library-head">
			<div class="library-title">
				<button
					class="mobile-menu"
					type="button"
					aria-label="Open navigation"
					onclick={() => (sidebarOpen = true)}
				>
					<AppIcon name="menu" />
				</button>
				<div>
					<p>Your library</p>
					<h1>{viewTitle}</h1>
				</div>
			</div>
			<div class="head-actions">
				<button class="command-trigger" type="button" onclick={() => (commandOpen = true)}>
					<AppIcon name="search" size={17} /><span>Commands</span><kbd>Ctrl K</kbd>
				</button>
				<Button size="small" onclick={() => (quickAddOpen = true)}
					><AppIcon name="plus" size={18} /> Quick add</Button
				>
			</div>
		</header>

		<section class="library-tools" aria-label="Library filters">
			<form bind:this={searchForm} method="GET" class="search-form">
				<input type="hidden" name="view" value={data.filters.view} />
				<label class="search-control">
					<span class="sr-only">Search links, notes, reminders, tags, and collections</span>
					<AppIcon name="search" size={18} />
					<input
						id="library-search"
						name="q"
						value={data.filters.query}
						placeholder="Search everything"
						oninput={debounceSearch}
					/>
					<kbd>/</kbd>
				</label>
				<select name="type" aria-label="Filter by type" onchange={() => searchForm.requestSubmit()}>
					<option value="">All types</option>
					<option value="link" selected={data.filters.type === 'link'}>Links</option>
					<option value="note" selected={data.filters.type === 'note'}>Notes</option>
					<option value="reminder" selected={data.filters.type === 'reminder'}>Reminders</option>
				</select>
				<select
					name="collection"
					aria-label="Filter by collection"
					onchange={() => searchForm.requestSubmit()}
				>
					<option value="">All collections</option>
					<option value="unorganized" selected={data.filters.collection === 'unorganized'}
						>Unorganized</option
					>
					{#each collections as collection (collection.id)}
						<option value={collection.id} selected={data.filters.collection === collection.id}
							>{collection.name}</option
						>
					{/each}
				</select>
				<select name="sort" aria-label="Sort items" onchange={() => searchForm.requestSubmit()}>
					<option value="createdAt" selected={data.filters.sort === 'createdAt'}>Newest</option>
					<option value="updatedAt" selected={data.filters.sort === 'updatedAt'}
						>Recently updated</option
					>
					<option value="title" selected={data.filters.sort === 'title'}>Title</option>
					<option value="domain" selected={data.filters.sort === 'domain'}>Domain</option>
					<option value="dueAt" selected={data.filters.sort === 'dueAt'}>Due date</option>
				</select>
			</form>

			<div class="view-actions">
				<div class="view-switch" aria-label="View mode">
					<button
						type="button"
						class:active={viewMode === 'grid'}
						aria-label="Card view"
						onclick={() => setViewMode('grid')}><AppIcon name="grid" size={17} /></button
					>
					<button
						type="button"
						class:active={viewMode === 'list'}
						aria-label="Compact list view"
						onclick={() => setViewMode('list')}><AppIcon name="list" size={17} /></button
					>
				</div>
				<button class="quiet-action" type="button" onclick={() => (collectionOpen = true)}
					>New collection</button
				>
				<button class="quiet-action" type="button" onclick={() => (tagOpen = true)}>New tag</button>
			</div>
		</section>

		{#if tags.length}
			<nav class="tag-filters" aria-label="Filter by tag">
				{#each tags as tag (tag.id)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						class:active={data.filters.tagIds.includes(tag.id)}
						href={`${resolve('/app')}?tag=${tag.id}`}
					>
						<span style:background={tag.color ?? '#e7dfd3'}></span>{tag.name}<small
							>{tag.itemCount}</small
						>
					</a>
				{/each}
			</nav>
		{/if}

		<div class="selection-bar" class:selection-bar--active={selected.size > 0}>
			<label
				><input type="checkbox" checked={allSelected} onchange={toggleAll} />
				<span>{allSelected ? 'Deselect all' : 'Select all'}</span></label
			>
			<span class="item-count"
				>{selected.size ? `${selected.size} selected` : `${items.length} items`}</span
			>
			{#if selected.size > 0}
				<form method="POST" action="?/bulk" onsubmit={confirmBulk}>
					{#each [...selected] as itemId (itemId)}<input
							type="hidden"
							name="itemIds"
							value={itemId}
						/>{/each}
					<select name="bulkAction" aria-label="Bulk action" required>
						<option value="">Choose action</option>
						<option value="favorite">Favorite</option>
						<option value="unfavorite">Remove favorite</option>
						<option value="archive">Archive</option>
						<option value="unarchive">Restore</option>
						<option value="delete">Delete</option>
					</select>
					<Button type="submit" size="small" variant="outline">Apply</Button>
				</form>
			{/if}
		</div>

		{#if navigating}
			<div class="skeleton-grid" aria-label="Loading library">
				{#each skeletonSlots as slot (slot)}<Skeleton
						height="17rem"
						radius="var(--radius-image)"
					/>{/each}
			</div>
		{:else if items.length}
			<section class:list-view={viewMode === 'list'} class="items-grid" aria-label="Saved items">
				{#each items as item (item.id)}
					<ItemCard
						{item}
						compact={viewMode === 'list'}
						selected={selected.has(item.id)}
						onSelect={toggleItem}
					/>
				{/each}
			</section>
			{#if data.library.nextCursor}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					class="load-more"
					href={`${resolve('/app')}?cursor=${encodeURIComponent(data.library.nextCursor)}`}
					>Load more</a
				>
			{/if}
		{:else}
			<EmptyState
				eyebrow={data.filters.query ? 'No matches' : 'A clean slate'}
				title={data.filters.query
					? 'Nothing hides behind that search.'
					: 'Keep the first useful thing.'}
				description={data.filters.query
					? 'Try a shorter phrase or remove a filter.'
					: 'Save a link, write a note, or set a reminder. It will stay private by default.'}
			>
				{#snippet icon()}<AppIcon
						name={data.filters.query ? 'search' : 'bookmark'}
						size={28}
					/>{/snippet}
				{#snippet actions()}<Button size="small" onclick={() => (quickAddOpen = true)}
						>Add your first item</Button
					>{/snippet}
			</EmptyState>
		{/if}

		{#if data.filters.view === 'reminders' && items.some((item) => item.reminderState === 'pending')}
			<button class="notification-prompt" type="button" onclick={enableNotifications}>
				<AppIcon name="bell" />
				<span
					><strong>Browser reminders are optional.</strong> Enable them only on this device.</span
				>
			</button>
		{/if}
	</main>
</div>

<QuickAdd bind:open={quickAddOpen} {collections} {tags} />
<CommandPalette bind:open={commandOpen} onQuickAdd={() => (quickAddOpen = true)} />

<Dialog
	bind:open={collectionOpen}
	title="New collection"
	description="Give related things a quiet place to live."
>
	<form class="dialog-form" method="POST" action="?/createCollection">
		<Input label="Name" name="name" required maxlength={100} />
		<Input label="Description" name="description" />
		<Input label="Color" name="color" type="color" value="#d8ff78" />
		<Button type="submit" fullWidth>Create collection</Button>
	</form>
</Dialog>

<Dialog bind:open={tagOpen} title="New tag" description="Tags can span every collection.">
	<form class="dialog-form" method="POST" action="?/createTag">
		<Input label="Name" name="name" required maxlength={80} />
		<Input label="Color" name="color" type="color" value="#e7dfd3" />
		<Button type="submit" fullWidth>Create tag</Button>
	</form>
</Dialog>

<Toast
	bind:open={toastOpen}
	tone={form?.success ? 'success' : 'warning'}
	title={form?.success ? 'Done' : 'Could not save'}
	message={actionMessage}
	assertive={!form?.success}
/>

<style>
	.dashboard-shell {
		display: grid;
		grid-template-columns: 16.5rem minmax(0, 1fr);
		min-height: calc(100vh - 4.5rem);
	}

	.library-main {
		min-width: 0;
		padding: clamp(2rem, 4vw, 4.5rem) var(--page-gutter) 6rem;
	}

	.library-head,
	.library-tools,
	.library-title,
	.head-actions,
	.view-actions,
	.view-switch,
	.selection-bar,
	.selection-bar form,
	.notification-prompt {
		display: flex;
		align-items: center;
	}

	.library-head {
		justify-content: space-between;
		gap: var(--space-5);
		margin-bottom: var(--space-7-5);
	}

	.library-title {
		gap: var(--space-3-75);
	}

	.library-title p,
	.library-title h1 {
		margin: 0;
	}

	.library-title p {
		margin-bottom: 0.45rem;
		color: var(--text-muted);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.library-title h1 {
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 6vw, 5.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.045em;
		line-height: 0.88;
	}

	.head-actions,
	.view-actions {
		gap: 0.65rem;
	}

	.command-trigger,
	.mobile-menu,
	.view-switch button,
	.quiet-action {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
	}

	.command-trigger {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.65rem 0.8rem;
	}

	kbd {
		border-radius: 0.25rem;
		background: var(--surface-subtle);
		padding: 0.18rem 0.35rem;
		font: inherit;
		font-size: 0.62rem;
	}

	.mobile-menu {
		display: none;
		width: 2.75rem;
		place-items: center;
	}

	.library-tools {
		justify-content: space-between;
		gap: var(--space-3-75);
		padding: var(--space-3-75) 0;
		border-top: var(--border-hairline) solid var(--border-default);
		border-bottom: var(--border-hairline) solid var(--border-default);
	}

	.search-form {
		display: grid;
		grid-template-columns: minmax(13rem, 1fr) repeat(3, auto);
		min-width: 0;
		flex: 1;
		gap: 0.55rem;
	}

	.search-control {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.55rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 0 0.75rem;
	}

	.search-control input {
		width: 100%;
		min-width: 0;
		min-height: 2.75rem;
		border: 0;
		outline: 0;
		background: transparent;
		color: inherit;
		font: inherit;
	}

	.search-form select,
	.selection-bar select {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0 0.75rem;
	}

	.view-switch {
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 0.2rem;
	}

	.view-switch button {
		display: grid;
		min-height: 2.3rem;
		width: 2.3rem;
		place-items: center;
		border: 0;
	}

	.view-switch button.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.quiet-action {
		padding: 0 0.75rem;
		font-size: var(--text-body-small);
	}

	.tag-filters {
		display: flex;
		gap: 0.45rem;
		padding: var(--space-3-75) 0 0;
		overflow-x: auto;
	}

	.tag-filters a {
		display: inline-flex;
		min-height: 2.4rem;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.45rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-full);
		color: inherit;
		padding: 0.45rem 0.7rem;
		font-size: var(--text-body-small);
		text-decoration: none;
	}

	.tag-filters a.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.tag-filters a > span {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.tag-filters small {
		opacity: 0.6;
	}

	.selection-bar {
		min-height: 4.5rem;
		gap: var(--space-3-75);
		margin-top: var(--space-5);
		border-bottom: var(--border-hairline) solid var(--border-subtle);
	}

	.selection-bar--active {
		position: sticky;
		top: 0;
		z-index: 30;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		padding: 0.6rem 0.8rem;
		box-shadow: 0 0.8rem 2rem rgb(18 22 19 / 10%);
	}

	.selection-bar label {
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.55rem;
		font-size: var(--text-body-small);
	}

	.selection-bar input {
		width: 1.1rem;
		height: 1.1rem;
		accent-color: var(--color-press-black);
	}

	.item-count {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.selection-bar form {
		gap: 0.5rem;
		margin-left: auto;
	}

	.items-grid,
	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
		gap: var(--space-5);
		padding-top: var(--space-5);
	}

	.items-grid.list-view {
		display: block;
	}

	.load-more {
		display: flex;
		width: fit-content;
		min-height: 3rem;
		align-items: center;
		margin: var(--space-7-5) auto 0;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		color: inherit;
		padding: 0.8rem 1.2rem;
		text-decoration: none;
	}

	.notification-prompt {
		width: 100%;
		gap: 0.85rem;
		margin-top: var(--space-7-5);
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--surface-accent) 16%, var(--surface-canvas));
		color: inherit;
		padding: 1rem;
		text-align: left;
	}

	.notification-prompt span {
		display: grid;
		gap: 0.2rem;
	}

	.dialog-form {
		display: grid;
		gap: var(--space-5);
	}

	@media (max-width: 74rem) {
		.library-tools {
			align-items: stretch;
			flex-direction: column;
		}

		.view-actions {
			justify-content: flex-end;
		}
	}

	@media (max-width: 58rem) {
		.dashboard-shell {
			display: block;
		}

		.mobile-menu {
			display: grid;
		}

		.search-form {
			grid-template-columns: 1fr 1fr;
		}

		.search-control {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 42rem) {
		.library-main {
			padding-top: 1.5rem;
		}

		.library-head {
			align-items: flex-start;
			flex-direction: column;
		}

		.head-actions {
			width: 100%;
		}

		.command-trigger {
			flex: 1;
		}

		.command-trigger kbd {
			display: none;
		}

		.search-form {
			display: flex;
			overflow-x: auto;
		}

		.search-control {
			min-width: min(22rem, 88vw);
		}

		.view-actions {
			justify-content: flex-start;
			overflow-x: auto;
		}

		.selection-bar {
			align-items: flex-start;
			flex-wrap: wrap;
		}

		.selection-bar form {
			width: 100%;
			margin: 0;
		}
	}
</style>
