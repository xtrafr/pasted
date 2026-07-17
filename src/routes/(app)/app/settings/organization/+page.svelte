<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CollectionShareDialog from '$lib/components/app/CollectionShareDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import type { PageData } from './$types';

	type SortMode = 'manual' | 'created_at' | 'title';
	type SortChoice = 'manual' | 'date';

	type CollectionRecord = {
		id: string;
		name: string;
		description: string | null;
		color: string | null;
		icon: string | null;
		sortOrder: number;
		sortMode: SortMode;
		itemCount: number;
	};

	type TagRecord = {
		id: string;
		name: string;
		color: string | null;
		itemCount: number;
	};

	type CollectionApiRecord = Omit<CollectionRecord, 'itemCount'> & { itemCount?: number };
	type TagApiRecord = Omit<TagRecord, 'itemCount'> & { itemCount?: number };
	type DeleteTarget =
		| { kind: 'collection'; id: string; name: string; itemCount: number }
		| { kind: 'tag'; id: string; name: string; itemCount: number };
	type ToastTone = 'success' | 'warning';

	let { data }: { data: PageData } = $props();

	function initialCollectionRecords(): CollectionRecord[] {
		return data.collections.map((collection) => ({
			id: collection.id,
			name: collection.name,
			description: collection.description,
			color: collection.color,
			icon: collection.icon,
			sortOrder: collection.sortOrder,
			sortMode: collection.sortMode,
			itemCount: collection.itemCount
		}));
	}

	function initialTagRecords(): TagRecord[] {
		return data.tags.map((tag) => ({
			id: tag.id,
			name: tag.name,
			color: tag.color,
			itemCount: tag.itemCount
		}));
	}

	let collections = $state<CollectionRecord[]>(initialCollectionRecords());
	let tags = $state<TagRecord[]>(initialTagRecords());

	let collectionDialogOpen = $state(false);
	let editingCollectionId = $state<string | null>(null);
	let collectionName = $state('');
	let collectionDescription = $state('');
	let collectionIcon = $state('');
	let collectionColor = $state('#2bee4b');
	let collectionUseColor = $state(true);
	let collectionSort = $state<SortChoice>('manual');
	let collectionError = $state('');
	let collectionSubmitting = $state(false);

	let tagDialogOpen = $state(false);
	let editingTagId = $state<string | null>(null);
	let tagName = $state('');
	let tagColor = $state('#c4e4c9');
	let tagUseColor = $state(true);
	let tagError = $state('');
	let tagSubmitting = $state(false);

	let deleteDialogOpen = $state(false);
	let deleteTarget = $state<DeleteTarget | null>(null);
	let deleteError = $state('');
	let deleteSubmitting = $state(false);
	let shareDialogOpen = $state(false);
	let sharingCollection = $state<CollectionRecord | null>(null);

	let toastOpen = $state(false);
	let toastTone = $state<ToastTone>('success');
	let toastTitle = $state('Saved');
	let toastMessage = $state('');

	const collectionDialogTitle = $derived(
		editingCollectionId ? 'Edit collection' : 'Create a collection'
	);
	const tagDialogTitle = $derived(editingTagId ? 'Edit tag' : 'Create a tag');
	const organizedItemCount = $derived(
		collections.reduce((total, collection) => total + collection.itemCount, 0)
	);
	const tagAssignmentCount = $derived(tags.reduce((total, tag) => total + tag.itemCount, 0));

	function itemLabel(count: number): string {
		return `${count.toLocaleString()} ${count === 1 ? 'item' : 'items'}`;
	}

	function collectionSortLabel(sortMode: SortMode): string {
		if (sortMode === 'manual') return 'Manual order';
		if (sortMode === 'title') return 'Title order';
		return 'Date added';
	}

	function collectionMark(collection: CollectionRecord): string {
		if (collection.icon) return collection.icon.slice(0, 2).toUpperCase();
		return collection.name.slice(0, 1).toUpperCase();
	}

	function errorMessage(error: unknown, fallback: string): string {
		return error instanceof Error && error.message ? error.message : fallback;
	}

	function notify(tone: ToastTone, title: string, message: string) {
		toastTone = tone;
		toastTitle = title;
		toastMessage = message;
		toastOpen = true;
	}

	async function refreshTaxonomyData() {
		try {
			await invalidateAll();
		} catch {
			// The local records remain correct and a later navigation will retry the layout load.
		}
	}

	async function apiRequest<T>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object) {
		const request: RequestInit = { method };
		if (body) {
			request.headers = { 'content-type': 'application/json' };
			request.body = JSON.stringify(body);
		}
		const response = await fetch(url, request);
		let payload: { ok: true; data: T } | { ok: false; error?: { message?: string } };
		try {
			payload = (await response.json()) as typeof payload;
		} catch {
			throw new Error('Pasted returned an unreadable response. Please try again.');
		}
		if (!response.ok || !payload.ok) {
			throw new Error(
				!payload.ok && payload.error?.message
					? payload.error.message
					: 'The change could not be saved.'
			);
		}
		return payload.data;
	}

	function sortCollections(records: CollectionRecord[]): CollectionRecord[] {
		return records.toSorted(
			(a, b) =>
				a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
		);
	}

	function sortTags(records: TagRecord[]): TagRecord[] {
		return records.toSorted((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	}

	function openNewCollection() {
		editingCollectionId = null;
		collectionName = '';
		collectionDescription = '';
		collectionIcon = '';
		collectionColor = '#2bee4b';
		collectionUseColor = true;
		collectionSort = 'manual';
		collectionError = '';
		collectionDialogOpen = true;
	}

	function openEditCollection(collection: CollectionRecord) {
		editingCollectionId = collection.id;
		collectionName = collection.name;
		collectionDescription = collection.description ?? '';
		collectionIcon = collection.icon ?? '';
		collectionColor = collection.color ?? '#2bee4b';
		collectionUseColor = Boolean(collection.color);
		collectionSort = collection.sortMode === 'manual' ? 'manual' : 'date';
		collectionError = '';
		collectionDialogOpen = true;
	}

	function openShareCollection(collection: CollectionRecord) {
		sharingCollection = collection;
		shareDialogOpen = true;
	}

	async function saveCollection(event: SubmitEvent) {
		event.preventDefault();
		collectionError = '';
		const name = collectionName.trim();
		if (!name) {
			collectionError = 'Enter a collection name.';
			return;
		}

		collectionSubmitting = true;
		try {
			const body = {
				name,
				description: collectionDescription.trim() || null,
				color: collectionUseColor ? collectionColor : null,
				icon: collectionIcon.trim().toLowerCase() || null,
				sortMode: collectionSort === 'manual' ? ('manual' as const) : ('created_at' as const)
			};
			const current = editingCollectionId
				? collections.find((collection) => collection.id === editingCollectionId)
				: undefined;
			const saved = editingCollectionId
				? await apiRequest<CollectionApiRecord>(
						resolve('/api/v1/collections/[id]', { id: editingCollectionId }),
						'PATCH',
						body
					)
				: await apiRequest<CollectionApiRecord>(resolve('/api/v1/collections'), 'POST', body);
			const record: CollectionRecord = {
				id: saved.id,
				name: saved.name,
				description: saved.description,
				color: saved.color,
				icon: saved.icon,
				sortOrder: saved.sortOrder,
				sortMode: saved.sortMode,
				itemCount: saved.itemCount ?? current?.itemCount ?? 0
			};

			collections = sortCollections(
				current
					? collections.map((collection) => (collection.id === record.id ? record : collection))
					: [...collections, record]
			);
			await refreshTaxonomyData();
			collectionDialogOpen = false;
			notify(
				'success',
				current ? 'Collection updated' : 'Collection created',
				`${record.name} is ready in your library.`
			);
		} catch (error) {
			collectionError = errorMessage(error, 'The collection could not be saved.');
		} finally {
			collectionSubmitting = false;
		}
	}

	function openNewTag() {
		editingTagId = null;
		tagName = '';
		tagColor = '#c4e4c9';
		tagUseColor = true;
		tagError = '';
		tagDialogOpen = true;
	}

	function openEditTag(tag: TagRecord) {
		editingTagId = tag.id;
		tagName = tag.name;
		tagColor = tag.color ?? '#c4e4c9';
		tagUseColor = Boolean(tag.color);
		tagError = '';
		tagDialogOpen = true;
	}

	async function saveTag(event: SubmitEvent) {
		event.preventDefault();
		tagError = '';
		const name = tagName.trim();
		if (!name) {
			tagError = 'Enter a tag name.';
			return;
		}

		tagSubmitting = true;
		try {
			const body = { name, color: tagUseColor ? tagColor : null };
			const current = editingTagId ? tags.find((tag) => tag.id === editingTagId) : undefined;
			const saved = editingTagId
				? await apiRequest<TagApiRecord>(
						resolve('/api/v1/tags/[id]', { id: editingTagId }),
						'PATCH',
						body
					)
				: await apiRequest<TagApiRecord>(resolve('/api/v1/tags'), 'POST', body);
			const record: TagRecord = {
				id: saved.id,
				name: saved.name,
				color: saved.color,
				itemCount: saved.itemCount ?? current?.itemCount ?? 0
			};
			tags = sortTags(
				current ? tags.map((tag) => (tag.id === record.id ? record : tag)) : [...tags, record]
			);
			await refreshTaxonomyData();
			tagDialogOpen = false;
			notify('success', current ? 'Tag updated' : 'Tag created', `${record.name} is ready to use.`);
		} catch (error) {
			tagError = errorMessage(error, 'The tag could not be saved.');
		} finally {
			tagSubmitting = false;
		}
	}

	function openDelete(target: DeleteTarget) {
		deleteTarget = target;
		deleteError = '';
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleteError = '';
		deleteSubmitting = true;
		const target = deleteTarget;
		try {
			if (target.kind === 'collection') {
				const result = await apiRequest<{ movedItems: number }>(
					resolve('/api/v1/collections/[id]', { id: target.id }),
					'DELETE'
				);
				collections = collections.filter((collection) => collection.id !== target.id);
				await refreshTaxonomyData();
				notify(
					'success',
					'Collection deleted',
					result.movedItems
						? `${itemLabel(result.movedItems)} moved to Unorganized.`
						: `${target.name} was removed.`
				);
			} else {
				const result = await apiRequest<{ affectedItems: number }>(
					resolve('/api/v1/tags/[id]', { id: target.id }),
					'DELETE'
				);
				tags = tags.filter((tag) => tag.id !== target.id);
				await refreshTaxonomyData();
				notify(
					'success',
					'Tag deleted',
					result.affectedItems
						? `Removed from ${itemLabel(result.affectedItems)}.`
						: `${target.name} was removed.`
				);
			}
			deleteDialogOpen = false;
			deleteTarget = null;
		} catch (error) {
			deleteError = errorMessage(error, `The ${target.kind} could not be deleted.`);
		} finally {
			deleteSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Organization settings | Pasted</title>
	<meta
		name="description"
		content="Create and manage the collections and tags that organize your private Pasted library."
	/>
</svelte:head>

<main class="organization-page">
	<div class="page-topline">
		<a class="back-link" href={resolve('/app')}><span aria-hidden="true">&larr;</span> Library</a>
		<nav aria-label="Settings">
			<a aria-current="page" href={resolve('/app/settings/organization')}>Organization</a>
			<a href={resolve('/settings/security')}>Security</a>
		</nav>
	</div>

	<header class="page-header">
		<div>
			<p class="eyebrow">Organization settings</p>
			<h1>Give everything a place.</h1>
			<p class="introduction">
				Collections make shelves. Tags make connections. Both stay private to your account.
			</p>
		</div>
		<dl class="summary" aria-label="Organization summary">
			<div>
				<dt>Collections</dt>
				<dd>{collections.length.toLocaleString()}</dd>
			</div>
			<div>
				<dt>Organized items</dt>
				<dd>{organizedItemCount.toLocaleString()}</dd>
			</div>
			<div>
				<dt>Tag placements</dt>
				<dd>{tagAssignmentCount.toLocaleString()}</dd>
			</div>
		</dl>
	</header>

	<div class="managers">
		<section class="manager" aria-labelledby="collections-title">
			<header class="manager-header">
				<div>
					<p class="section-number">01</p>
					<h2 id="collections-title">Collections</h2>
					<p>One home per item, with its own name, visual cue, and order.</p>
				</div>
				<Button size="small" onclick={openNewCollection}>New collection</Button>
			</header>

			{#if collections.length}
				<ul class="entity-list collection-list">
					{#each collections as collection (collection.id)}
						<li>
							<span
								class="collection-mark"
								class:collection-mark--plain={!collection.color}
								style:background-color={collection.color ?? undefined}
								aria-hidden="true">{collectionMark(collection)}</span
							>
							<div class="entity-copy">
								<h3>{collection.name}</h3>
								<p>{collection.description || 'No description yet.'}</p>
								<ul class="metadata" aria-label={`${collection.name} details`}>
									<li>{itemLabel(collection.itemCount)}</li>
									<li>{collectionSortLabel(collection.sortMode)}</li>
									{#if collection.icon}<li>Icon: {collection.icon}</li>{/if}
								</ul>
							</div>
							<div class="entity-actions" aria-label={`Actions for ${collection.name}`}>
								<button type="button" onclick={() => openShareCollection(collection)}>
									Share
								</button>
								<button type="button" onclick={() => openEditCollection(collection)}>Edit</button>
								<button
									type="button"
									onclick={() =>
										openDelete({
											kind: 'collection',
											id: collection.id,
											name: collection.name,
											itemCount: collection.itemCount
										})}>Delete</button
								>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					compact
					eyebrow="No collections"
					title="Start with one useful shelf."
					description="A collection gives related links, notes, and reminders a shared home."
				>
					{#snippet actions()}<Button size="small" onclick={openNewCollection}
							>Create a collection</Button
						>{/snippet}
				</EmptyState>
			{/if}
		</section>

		<section class="manager" aria-labelledby="tags-title">
			<header class="manager-header">
				<div>
					<p class="section-number">02</p>
					<h2 id="tags-title">Tags</h2>
					<p>Flexible labels that can connect items across every collection.</p>
				</div>
				<Button size="small" onclick={openNewTag}>New tag</Button>
			</header>

			{#if tags.length}
				<ul class="entity-list tag-list">
					{#each tags as tag (tag.id)}
						<li>
							<span
								class="tag-dot"
								class:tag-dot--plain={!tag.color}
								style:background-color={tag.color ?? undefined}
								aria-hidden="true"
							></span>
							<div class="entity-copy tag-copy">
								<h3>{tag.name}</h3>
								<p>{itemLabel(tag.itemCount)}</p>
							</div>
							<div class="entity-actions" aria-label={`Actions for ${tag.name}`}>
								<button type="button" onclick={() => openEditTag(tag)}>Edit</button>
								<button
									type="button"
									onclick={() =>
										openDelete({
											kind: 'tag',
											id: tag.id,
											name: tag.name,
											itemCount: tag.itemCount
										})}>Delete</button
								>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					compact
					eyebrow="No tags"
					title="Connect ideas across shelves."
					description="Tags can group items without changing which collection holds them."
				>
					{#snippet actions()}<Button size="small" onclick={openNewTag}>Create a tag</Button
						>{/snippet}
				</EmptyState>
			{/if}
		</section>
	</div>
</main>

{#if sharingCollection}
	<CollectionShareDialog
		bind:open={shareDialogOpen}
		collection={sharingCollection}
		onMessage={(message) => notify('success', 'Sharing updated', message)}
	/>
{/if}

<Dialog
	bind:open={collectionDialogOpen}
	title={collectionDialogTitle}
	description="Names and descriptions stay searchable. Color and icon are optional visual cues."
>
	<form id="collection-form" class="dialog-form" onsubmit={saveCollection}>
		<Input label="Name" required maxlength={120} autocomplete="off" bind:value={collectionName} />
		<Textarea
			label="Description"
			rows={3}
			maxlength={2000}
			placeholder="What belongs here?"
			bind:value={collectionDescription}
		/>
		<div class="form-grid">
			<Input
				label="Icon name"
				description="Optional. Letters, numbers, and hyphens only."
				placeholder="bookmark"
				pattern="[A-Za-z0-9-]+"
				maxlength={64}
				autocomplete="off"
				bind:value={collectionIcon}
			/>
			<Select label="Item order" bind:value={collectionSort}>
				<option value="manual">Manual</option>
				<option value="date">Date added</option>
			</Select>
		</div>
		<div class="color-control">
			<Checkbox
				label="Use a collection color"
				description="Turn this off for a neutral collection."
				bind:checked={collectionUseColor}
			/>
			<Input
				label="Collection color"
				type="color"
				disabled={!collectionUseColor}
				bind:value={collectionColor}
			/>
		</div>
		{#if collectionError}<p class="form-error" role="alert">{collectionError}</p>{/if}
		<div class="form-actions">
			<Button
				type="button"
				variant="outline"
				size="small"
				disabled={collectionSubmitting}
				onclick={() => (collectionDialogOpen = false)}>Cancel</Button
			>
			<Button
				type="submit"
				size="small"
				loading={collectionSubmitting}
				loadingLabel="Saving collection"
				>{editingCollectionId ? 'Save changes' : 'Create collection'}</Button
			>
		</div>
	</form>
</Dialog>

<Dialog
	bind:open={tagDialogOpen}
	title={tagDialogTitle}
	description="A short name and an optional color are all a tag needs."
>
	<form id="tag-form" class="dialog-form" onsubmit={saveTag}>
		<Input label="Name" required maxlength={80} autocomplete="off" bind:value={tagName} />
		<div class="color-control">
			<Checkbox
				label="Use a tag color"
				description="Turn this off for a neutral tag."
				bind:checked={tagUseColor}
			/>
			<Input label="Tag color" type="color" disabled={!tagUseColor} bind:value={tagColor} />
		</div>
		{#if tagError}<p class="form-error" role="alert">{tagError}</p>{/if}
		<div class="form-actions">
			<Button
				type="button"
				variant="outline"
				size="small"
				disabled={tagSubmitting}
				onclick={() => (tagDialogOpen = false)}>Cancel</Button
			>
			<Button type="submit" size="small" loading={tagSubmitting} loadingLabel="Saving tag"
				>{editingTagId ? 'Save changes' : 'Create tag'}</Button
			>
		</div>
	</form>
</Dialog>

<Dialog
	bind:open={deleteDialogOpen}
	title={deleteTarget?.kind === 'collection' ? 'Delete collection?' : 'Delete tag?'}
	description="This action cannot be undone. Your saved items will not be deleted."
	dismissible={!deleteSubmitting}
>
	{#if deleteTarget}
		<div class="delete-confirmation">
			<p>
				{#if deleteTarget.kind === 'collection'}
					<strong>{deleteTarget.name}</strong> currently holds {itemLabel(deleteTarget.itemCount)}.
					They will move to Unorganized.
				{:else}
					<strong>{deleteTarget.name}</strong> is attached to {itemLabel(deleteTarget.itemCount)}.
					The tag will be removed from them.
				{/if}
			</p>
			{#if deleteError}<p class="form-error" role="alert">{deleteError}</p>{/if}
			<div class="form-actions">
				<Button
					type="button"
					variant="outline"
					size="small"
					disabled={deleteSubmitting}
					onclick={() => (deleteDialogOpen = false)}>Keep it</Button
				>
				<button
					class="delete-button"
					type="button"
					disabled={deleteSubmitting}
					aria-busy={deleteSubmitting}
					onclick={confirmDelete}
				>
					{deleteSubmitting ? 'Deleting' : `Delete ${deleteTarget.kind}`}
				</button>
			</div>
		</div>
	{/if}
</Dialog>

<Toast
	bind:open={toastOpen}
	tone={toastTone}
	title={toastTitle}
	message={toastMessage}
	assertive={toastTone === 'warning'}
/>

<style>
	.organization-page {
		width: min(100%, var(--page-max-width));
		margin: 0 auto;
		padding: var(--space-7-5) var(--page-gutter) var(--space-20);
	}

	.page-topline,
	.page-topline nav,
	.manager-header,
	.entity-actions,
	.form-actions {
		display: flex;
		align-items: center;
	}

	.page-topline {
		justify-content: space-between;
		gap: var(--space-5);
		margin-bottom: clamp(3rem, 7vw, 6rem);
	}

	.back-link,
	.page-topline nav a,
	.entity-actions button {
		font-size: var(--text-body-small);
		text-decoration: none;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.back-link:hover,
	.page-topline nav a:hover,
	.entity-actions button:hover {
		text-decoration: underline;
		text-underline-offset: 0.28em;
	}

	.page-topline nav {
		gap: var(--space-5);
	}

	.page-topline nav a {
		color: var(--text-muted);
	}

	.page-topline nav a[aria-current='page'] {
		color: var(--text-primary);
		font-weight: var(--font-weight-medium);
	}

	.page-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.58fr);
		align-items: end;
		gap: clamp(2rem, 7vw, 7rem);
		padding-bottom: clamp(3rem, 7vw, 6rem);
	}

	.eyebrow,
	.section-number,
	.manager-header > div > p:last-child,
	.page-header h1,
	.introduction,
	.summary,
	.manager-header h2,
	.entity-copy h3,
	.entity-copy p,
	.metadata,
	.delete-confirmation p {
		margin: 0;
	}

	.eyebrow,
	.section-number,
	.summary dt {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.page-header h1 {
		max-width: 10ch;
		margin-top: var(--space-3-75);
		font-family: var(--font-display);
		font-size: clamp(4.5rem, 11vw, 10rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.055em;
		line-height: 0.82;
	}

	.introduction {
		max-width: 48ch;
		margin-top: var(--space-7-5);
		color: var(--text-muted);
		font-size: var(--text-body);
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border-top: var(--border-hairline) solid var(--border-default);
		border-bottom: var(--border-hairline) solid var(--border-default);
	}

	.summary > div {
		display: grid;
		align-content: space-between;
		gap: var(--space-5);
		min-height: 9rem;
		padding: var(--space-5);
	}

	.summary > div + div {
		border-left: var(--border-hairline) solid var(--border-default);
	}

	.summary dt {
		color: var(--text-muted);
	}

	.summary dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 5vw, 4rem);
		line-height: 0.8;
	}

	.managers {
		display: grid;
		gap: clamp(4rem, 9vw, 8rem);
	}

	.manager {
		display: grid;
		gap: var(--space-7-5);
	}

	.manager-header {
		align-items: end;
		justify-content: space-between;
		gap: var(--space-5);
		border-top: var(--border-hairline) solid var(--border-default);
		padding-top: var(--space-5);
	}

	.manager-header > div {
		display: grid;
		gap: var(--space-2);
	}

	.manager-header h2 {
		font-family: var(--font-display);
		font-size: var(--text-subheading);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	.manager-header > div > p:last-child {
		max-width: 56ch;
		color: var(--text-muted);
	}

	.entity-list,
	.metadata {
		padding: 0;
		list-style: none;
	}

	.entity-list {
		margin: 0;
		border-bottom: var(--border-hairline) solid var(--border-default);
	}

	.entity-list > li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-5);
		border-top: var(--border-hairline) solid var(--border-default);
		padding: var(--space-5) 0;
	}

	.collection-mark {
		display: grid;
		width: 4rem;
		height: 4rem;
		place-items: center;
		border: var(--border-hairline) solid transparent;
		border-radius: var(--radius-image);
		color: var(--color-typesetter-ink);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
	}

	.collection-mark--plain {
		border-color: var(--border-subtle);
		background: transparent;
	}

	.entity-copy {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.entity-copy h3 {
		overflow: hidden;
		font-size: var(--text-body);
		font-weight: var(--font-weight-medium);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.entity-copy > p,
	.tag-copy p {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.metadata {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
		margin-top: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.metadata li + li::before {
		content: '/';
		margin-right: var(--space-5);
		color: var(--border-default);
	}

	.entity-actions {
		gap: var(--space-2);
	}

	.entity-actions button {
		min-width: 3rem;
		min-height: 2.75rem;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		padding: var(--space-2);
	}

	.entity-actions button:hover {
		background: color-mix(in srgb, var(--color-muted-sage) 22%, transparent);
	}

	.tag-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		border-right: var(--border-hairline) solid var(--border-default);
	}

	.tag-list > li {
		grid-template-columns: auto minmax(0, 1fr) auto;
		border-left: var(--border-hairline) solid var(--border-default);
		padding: var(--space-5);
	}

	.tag-dot {
		width: 1rem;
		height: 1rem;
		border: var(--border-hairline) solid transparent;
		border-radius: var(--radius-full);
	}

	.tag-dot--plain {
		border-color: var(--border-default);
		background: transparent;
	}

	.dialog-form,
	.delete-confirmation {
		display: grid;
		gap: var(--space-5);
	}

	.form-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
		gap: var(--space-5);
	}

	.color-control {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(8rem, 0.45fr);
		align-items: end;
		gap: var(--space-5);
		border-top: var(--border-hairline) solid var(--border-subtle);
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: var(--space-3-75) 0;
	}

	.form-error {
		margin: 0;
		border-left: 3px solid var(--color-press-black);
		padding-left: var(--space-3-75);
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.form-actions {
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-2);
		padding-top: var(--space-2);
	}

	.delete-confirmation > p {
		color: var(--text-muted);
	}

	.delete-confirmation strong {
		color: var(--text-primary);
		font-weight: var(--font-weight-medium);
	}

	.delete-button {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--color-press-black);
		border-radius: var(--radius-button);
		background: var(--color-press-black);
		color: var(--text-inverse);
		padding: 0.75rem 1rem;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.delete-button:hover:not(:disabled) {
		background: transparent;
		color: var(--text-primary);
	}

	.delete-button:disabled {
		opacity: 0.52;
	}

	@media (max-width: 64rem) {
		.page-header {
			grid-template-columns: 1fr;
		}

		.summary {
			max-width: 42rem;
		}

		.tag-list {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 42rem) {
		.organization-page {
			padding-top: var(--space-5);
		}

		.page-topline {
			align-items: flex-start;
			margin-bottom: var(--space-15);
		}

		.page-topline nav {
			align-items: flex-end;
			gap: var(--space-2);
			flex-direction: column;
		}

		.page-header h1 {
			font-size: clamp(4rem, 23vw, 7rem);
		}

		.summary {
			grid-template-columns: 1fr;
		}

		.summary > div {
			grid-template-columns: 1fr auto;
			align-items: end;
			min-height: auto;
		}

		.summary > div + div {
			border-top: var(--border-hairline) solid var(--border-default);
			border-left: 0;
		}

		.manager-header {
			align-items: flex-start;
			flex-direction: column;
		}

		.entity-list > li,
		.tag-list > li {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.entity-actions {
			grid-column: 2;
			justify-content: flex-start;
		}

		.collection-mark {
			align-self: start;
		}

		.form-grid,
		.color-control {
			grid-template-columns: 1fr;
		}

		.form-actions > :global(*) {
			flex: 1;
		}
	}
</style>
