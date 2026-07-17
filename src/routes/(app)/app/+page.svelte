<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import AppIcon from '$lib/components/app/AppIcon.svelte';
	import ItemCard from '$lib/components/app/ItemCard.svelte';
	import LibrarySidebar from '$lib/components/app/LibrarySidebar.svelte';
	import ReminderAlerts from '$lib/components/app/ReminderAlerts.svelte';
	import type { LibraryCollection, LibraryItem, LibraryTag } from '$lib/components/app/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let sidebarOpen = $state(false);
	let collectionOpen = $state(false);
	let tagOpen = $state(false);
	let toastOpen = $state(false);
	let clientToastMessage = $state('');
	let clientToastTone = $state<'success' | 'warning'>('success');
	let viewMode = $state<'grid' | 'list'>('grid');
	let bulkAction = $state('');
	let recentSearches = $state.raw<string[]>([]);
	const selected = new SvelteSet<string>();
	let searchForm: HTMLFormElement;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	const skeletonSlots = [0, 1, 2, 3, 4, 5];

	const items = $derived(data.library.items as LibraryItem[]);
	const collections = $derived(data.collections as LibraryCollection[]);
	const tags = $derived(data.tags as LibraryTag[]);
	const allSelected = $derived(items.length > 0 && selected.size === items.length);
	const dueReminders = $derived(data.dueReminders as LibraryItem[]);
	const activeFilterCount = $derived(
		[
			data.filters.query,
			data.filters.sourceImport,
			data.filters.domain,
			data.filters.createdFrom,
			data.filters.createdTo,
			data.filters.type,
			data.filters.collection,
			...data.filters.tagIds
		].filter(Boolean).length
	);
	const viewTitle = $derived(
		data.filters.sourceImport
			? 'Imported items'
			: data.filters.collection
				? data.filters.collection === 'unorganized'
					? 'Unorganized'
					: (collections.find((entry) => entry.id === data.filters.collection)?.name ??
						'Collection')
				: data.filters.view === 'favorites'
					? 'Favorites'
					: data.filters.view === 'reminders'
						? 'Reminders'
						: data.filters.view === 'archived'
							? 'Archive'
							: 'Everything'
	);
	const actionMessage = $derived(
		clientToastMessage ||
			(form?.success
				? form.kind === 'bulk'
					? `${form.affected} items updated.`
					: `${form.kind[0]?.toUpperCase()}${form.kind.slice(1)} saved.`
				: (form?.message ?? 'The operation could not be completed.'))
	);
	const toastTone = $derived(
		clientToastMessage ? clientToastTone : form?.success ? 'success' : 'warning'
	);
	const toastTitle = $derived(
		clientToastMessage
			? clientToastTone === 'success'
				? 'Done'
				: 'Could not update'
			: form?.success
				? 'Done'
				: 'Could not save'
	);

	$effect(() => {
		const stored = localStorage.getItem('pasted-view-mode');
		if (stored === 'list' || stored === 'grid') viewMode = stored;
	});

	$effect(() => {
		try {
			const stored = JSON.parse(localStorage.getItem('pasted-search-history-v1') ?? '[]');
			recentSearches = Array.isArray(stored)
				? stored.filter((value): value is string => typeof value === 'string').slice(0, 6)
				: [];
		} catch {
			recentSearches = [];
		}
	});

	$effect(() => {
		const query = data.filters.query.trim();
		if (!query) return;
		try {
			const stored = JSON.parse(localStorage.getItem('pasted-search-history-v1') ?? '[]');
			const history = Array.isArray(stored)
				? stored.filter((value): value is string => typeof value === 'string')
				: [];
			const next = [query, ...history.filter((value) => value !== query)].slice(0, 6);
			localStorage.setItem('pasted-search-history-v1', JSON.stringify(next));
			recentSearches = next;
		} catch {
			// Search still works when browser storage is unavailable.
		}
	});

	$effect(() => {
		if (form) toastOpen = true;
	});

	$effect(() => {
		const itemIds = new Set(items.map((item) => item.id));
		for (const itemId of selected) {
			if (!itemIds.has(itemId)) selected.delete(itemId);
		}
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

	async function handleItemAction(
		message: string,
		refresh = false,
		tone: 'success' | 'warning' = 'success'
	) {
		clientToastMessage = message;
		clientToastTone = tone;
		toastOpen = true;
		if (refresh) await invalidateAll();
	}

	function openGlobalQuickAdd() {
		document.querySelector<HTMLButtonElement>('#global-quick-add')?.click();
	}

	function currentFilterParams(): SvelteURLSearchParams {
		const params = new SvelteURLSearchParams();
		if (data.filters.view && data.filters.view !== 'all') params.set('view', data.filters.view);
		if (data.filters.query) params.set('q', data.filters.query);
		if (data.filters.sourceImport) params.set('sourceImport', data.filters.sourceImport);
		if (data.filters.domain) params.set('domain', data.filters.domain);
		if (data.filters.createdFrom) params.set('createdFrom', data.filters.createdFrom);
		if (data.filters.createdTo) params.set('createdTo', data.filters.createdTo);
		if (data.filters.type) params.set('type', data.filters.type);
		if (data.filters.collection) params.set('collection', data.filters.collection);
		for (const tagId of data.filters.tagIds) params.append('tag', tagId);
		if (data.filters.sort && data.filters.sort !== 'createdAt')
			params.set('sort', data.filters.sort);
		if (data.filters.direction && data.filters.direction !== 'desc') {
			params.set('direction', data.filters.direction);
		}
		return params;
	}

	function libraryHref(changes: Record<string, string | string[] | null>): string {
		const params = currentFilterParams();
		for (const [name, value] of Object.entries(changes)) {
			params.delete(name);
			if (Array.isArray(value)) {
				for (const entry of value) params.append(name, entry);
			} else if (value) params.set(name, value);
		}
		const query = params.toString();
		return query ? `${resolve('/app')}?${query}` : resolve('/app');
	}

	function tagHref(tagId: string): string {
		const next = data.filters.tagIds.includes(tagId)
			? data.filters.tagIds.filter((value) => value !== tagId)
			: [...data.filters.tagIds, tagId];
		return libraryHref({ tag: next, cursor: null });
	}

	function selectedExportHref(): string {
		const params = new SvelteURLSearchParams();
		for (const itemId of selected) params.append('id', itemId);
		return `${resolve('/app/export')}?${params.toString()}`;
	}

	function searchExportHref(): string {
		return `${resolve('/app/export')}?search=${encodeURIComponent(data.filters.query)}`;
	}

	function clearSearchHistory() {
		localStorage.removeItem('pasted-search-history-v1');
		recentSearches = [];
	}
</script>

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
		</header>

		<ReminderAlerts reminders={dueReminders} />

		{#if data.filters.sourceImport}
			<div class="filter-notice" role="status">
				<span><AppIcon name="import" size={16} /> Showing links from one completed import.</span>
				<a href={libraryHref({ sourceImport: null, cursor: null })}>Show the full library</a>
			</div>
		{/if}

		<section class="library-tools" aria-label="Library filters">
			<form bind:this={searchForm} method="GET" class="search-form">
				<input type="hidden" name="view" value={data.filters.view} />
				{#if data.filters.sourceImport}<input
						type="hidden"
						name="sourceImport"
						value={data.filters.sourceImport}
					/>{/if}
				{#each data.filters.tagIds as tagId (tagId)}<input
						type="hidden"
						name="tag"
						value={tagId}
					/>{/each}
				<label class="search-control">
					<span class="sr-only">Search links, notes, reminders, tags, and collections</span>
					<AppIcon name="search" size={18} />
					<input
						id="library-search"
						name="q"
						value={data.filters.query}
						list="search-history"
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
				<details
					class="advanced-filters"
					open={Boolean(
						data.filters.domain ||
						data.filters.createdFrom ||
						data.filters.createdTo ||
						data.filters.direction === 'asc'
					)}
				>
					<summary>
						More filters{activeFilterCount ? ` (${activeFilterCount} active)` : ''}
					</summary>
					<div>
						<label>
							Domain
							<input
								name="domain"
								value={data.filters.domain}
								placeholder="example.com"
								autocapitalize="none"
								autocomplete="off"
							/>
						</label>
						<label>
							Created from
							<input type="date" name="createdFrom" value={data.filters.createdFrom} />
						</label>
						<label>
							Created to
							<input type="date" name="createdTo" value={data.filters.createdTo} />
						</label>
						<label>
							Direction
							<select name="direction">
								<option value="desc" selected={data.filters.direction === 'desc'}>Descending</option
								>
								<option value="asc" selected={data.filters.direction === 'asc'}>Ascending</option>
							</select>
						</label>
						<Button type="submit" size="small" variant="outline">Apply filters</Button>
						{#if activeFilterCount}<a href={resolve('/app')}>Clear filters</a>{/if}
					</div>
				</details>
			</form>
			<datalist id="search-history">
				{#each recentSearches as query (query)}<option value={query}></option>{/each}
			</datalist>

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
					<a class:active={data.filters.tagIds.includes(tag.id)} href={tagHref(tag.id)}>
						<span style:background={tag.color ?? '#e7dfd3'}></span>{tag.name}<small
							>{tag.itemCount}</small
						>
					</a>
				{/each}
			</nav>
		{/if}

		{#if recentSearches.length}
			<nav class="search-history" aria-label="Recent searches">
				<span>Recent</span>
				{#each recentSearches as query (query)}
					<a
						class:active={data.filters.query === query}
						href={libraryHref({ q: query, cursor: null })}>{query}</a
					>
				{/each}
				<button type="button" onclick={clearSearchHistory}>Clear</button>
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
					<select name="bulkAction" aria-label="Bulk action" bind:value={bulkAction} required>
						<option value="">Choose action</option>
						<option value="favorite">Favorite</option>
						<option value="unfavorite">Remove favorite</option>
						<option value="archive">Archive</option>
						<option value="unarchive">Restore</option>
						<option value="move_collection">Move to collection</option>
						<option value="add_tags">Add tag</option>
						<option value="remove_tags">Remove tag</option>
						<option value="delete">Delete</option>
					</select>
					{#if bulkAction === 'move_collection'}
						<select name="collectionId" aria-label="Destination collection">
							<option value="">Unorganized</option>
							{#each collections as collection (collection.id)}<option value={collection.id}
									>{collection.name}</option
								>{/each}
						</select>
					{:else if bulkAction === 'add_tags' || bulkAction === 'remove_tags'}
						<select name="tagIds" aria-label="Tag" required>
							<option value="">Choose tag</option>
							{#each tags as tag (tag.id)}<option value={tag.id}>{tag.name}</option>{/each}
						</select>
					{/if}
					<Button type="submit" size="small" variant="outline">Apply</Button>
					<a class="selection-export" href={selectedExportHref()}>Export selection</a>
				</form>
			{/if}
			{#if selected.size === 0 && data.filters.query}
				<a class="selection-export" href={searchExportHref()}>Export search results</a>
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
						{collections}
						{tags}
						query={data.filters.query}
						compact={viewMode === 'list'}
						selected={selected.has(item.id)}
						onSelect={toggleItem}
						onAction={handleItemAction}
					/>
				{/each}
			</section>
			{#if data.library.nextCursor}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a class="load-more" href={libraryHref({ cursor: data.library.nextCursor })}>Load more</a>
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
				{#snippet actions()}<Button size="small" onclick={openGlobalQuickAdd}
						>Add your first item</Button
					>{/snippet}
			</EmptyState>
		{/if}
	</main>
</div>

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
	tone={toastTone}
	title={toastTitle}
	message={actionMessage}
	assertive={toastTone === 'warning'}
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
	.view-actions,
	.view-switch,
	.selection-bar,
	.selection-bar form,
	.filter-notice {
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

	.view-actions {
		gap: 0.65rem;
	}

	.mobile-menu,
	.view-switch button,
	.quiet-action {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
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

	.filter-notice {
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: var(--space-5);
		border-left: 0.3rem solid var(--surface-accent);
		background: var(--surface-subtle);
		padding: 0.85rem 1rem;
		font-size: var(--text-body-small);
	}

	.filter-notice span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-notice a {
		color: inherit;
		font-weight: var(--font-weight-medium);
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
	.search-form input,
	.selection-bar select {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0 0.75rem;
	}

	.search-control input {
		border: 0;
	}

	.advanced-filters {
		grid-column: 1 / -1;
		border: 0;
	}

	.advanced-filters summary {
		width: fit-content;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		cursor: pointer;
	}

	.advanced-filters > div {
		display: grid;
		grid-template-columns: repeat(4, minmax(9rem, 1fr)) auto auto;
		align-items: end;
		gap: 0.55rem;
		padding-top: 0.75rem;
	}

	.advanced-filters label {
		display: grid;
		gap: 0.35rem;
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	.advanced-filters a {
		align-self: center;
		color: inherit;
		font-size: var(--text-body-small);
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

	.search-history {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding-top: 0.75rem;
		overflow-x: auto;
		font-size: var(--text-caption);
	}

	.search-history > span {
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.search-history a,
	.search-history button {
		flex: 0 0 auto;
		border: 0;
		border-radius: var(--radius-full);
		background: var(--surface-subtle);
		color: inherit;
		padding: 0.35rem 0.6rem;
		font: inherit;
		text-decoration: none;
	}

	.search-history a.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.search-history button {
		background: transparent;
		text-decoration: underline;
		cursor: pointer;
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
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-left: auto;
	}

	.selection-export {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		color: inherit;
		padding: 0.55rem 0.8rem;
		font-size: var(--text-body-small);
		text-decoration: none;
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

		.advanced-filters > div {
			grid-template-columns: repeat(2, minmax(10rem, 1fr));
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

		.search-form {
			grid-template-columns: 1fr;
		}

		.search-control {
			min-width: 0;
			grid-column: auto;
		}

		.advanced-filters {
			grid-column: auto;
		}

		.advanced-filters > div {
			grid-template-columns: 1fr;
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

		.selection-bar form select,
		.selection-bar form :global(button) {
			flex: 1 1 10rem;
		}

		.filter-notice {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
