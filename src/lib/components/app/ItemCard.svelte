<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import SafeMarkdown from '$lib/components/ui/SafeMarkdown.svelte';
	import AppIcon from './AppIcon.svelte';
	import ItemEditDialog from './ItemEditDialog.svelte';
	import ItemShareDialog from './ItemShareDialog.svelte';
	import type { LibraryCollection, LibraryItem, LibraryTag } from './types';

	let {
		item,
		selected = false,
		compact = false,
		query = '',
		collections,
		tags,
		onSelect,
		onAction
	}: {
		item: LibraryItem;
		selected?: boolean;
		compact?: boolean;
		query?: string;
		collections: LibraryCollection[];
		tags: LibraryTag[];
		onSelect?: (id: string, selected: boolean) => void;
		onAction?: (
			message: string,
			refresh?: boolean,
			tone?: 'success' | 'warning'
		) => void | Promise<void>;
	} = $props();

	let editOpen = $state(false);
	let shareOpen = $state(false);
	let deleteOpen = $state(false);
	let busyAction = $state('');
	let actionMenu: HTMLDetailsElement;
	let liveMetadata = $state.raw<{
		metadataTitle: string | null;
		metadataDescription: string | null;
		siteName: string | null;
		state: 'pending' | 'fetching' | 'ready' | 'failed' | 'blocked';
		faviconUrl: string | null;
		previewUrl: string | null;
	} | null>(null);

	const metadataState = $derived(liveMetadata?.state ?? item.metadataState);
	const faviconUrl = $derived(
		liveMetadata
			? liveMetadata.faviconUrl
			: item.faviconAssetId
				? resolve('/api/v1/metadata/assets/[id]', { id: item.faviconAssetId })
				: null
	);
	const previewUrl = $derived(
		liveMetadata
			? liveMetadata.previewUrl
			: item.previewAssetId
				? resolve('/api/v1/metadata/assets/[id]', { id: item.previewAssetId })
				: null
	);

	const displayTitle = $derived(
		item.title ??
			(liveMetadata ? liveMetadata.metadataTitle : item.metadataTitle) ??
			(item.type === 'note' ? 'Untitled note' : (item.domain ?? 'Saved item'))
	);
	const displayDescription = $derived(
		item.type === 'note'
			? item.noteBody
			: item.type === 'reminder'
				? item.reminderDescription
				: (item.description ??
					(liveMetadata ? liveMetadata.metadataDescription : item.metadataDescription))
	);
	const titleParts = $derived(highlightParts(displayTitle, query));
	const descriptionParts = $derived(highlightParts(displayDescription ?? '', query));

	function highlightParts(value: string, search: string): Array<{ text: string; match: boolean }> {
		const terms = [
			...new Set(
				search
					.trim()
					.split(/\s+/)
					.map((term) => term.trim())
					.filter((term) => term.length >= 2)
			)
		];
		if (!value || terms.length === 0) return [{ text: value, match: false }];
		const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		const matcher = new RegExp(`(${escaped.join('|')})`, 'gi');
		return value
			.split(matcher)
			.filter(Boolean)
			.map((text) => ({
				text,
				match: terms.some((term) => term.toLowerCase() === text.toLowerCase())
			}));
	}

	onMount(() => {
		if (
			item.type !== 'link' ||
			!item.targetId ||
			(item.metadataState !== 'pending' && item.metadataState !== 'fetching')
		) {
			return;
		}

		let cancelled = false;
		let attempts = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const poll = async () => {
			if (cancelled || attempts >= 30 || !item.targetId) return;
			attempts += 1;
			try {
				const response = await fetch(
					resolve('/api/v1/metadata/[targetId]', { targetId: item.targetId }),
					{ headers: { accept: 'application/json' } }
				);
				const payload = (await response.json()) as {
					ok: boolean;
					data?: typeof liveMetadata;
				};
				if (response.ok && payload.ok && payload.data) liveMetadata = payload.data;
			} catch {
				// A later poll can recover from a short network interruption.
			}

			if (
				!cancelled &&
				attempts < 30 &&
				(!liveMetadata || liveMetadata.state === 'pending' || liveMetadata.state === 'fetching')
			) {
				timer = setTimeout(poll, 1_500);
			}
		};

		timer = setTimeout(poll, 600);
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	});

	function formatDate(value: Date | null): string {
		if (!value) return '';
		return new Intl.DateTimeFormat('en', {
			month: 'short',
			day: 'numeric',
			year: value.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
		}).format(value);
	}

	async function apiAction(url: string, method: 'PUT' | 'DELETE', body?: Record<string, unknown>) {
		const response = await fetch(url, {
			method,
			...(body
				? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
				: {})
		});
		const payload = (await response.json()) as {
			ok: boolean;
			error?: { message?: string };
		};
		if (!response.ok || !payload.ok) {
			throw new Error(payload.error?.message ?? 'The action could not be completed.');
		}
	}

	function closeMenu() {
		actionMenu?.removeAttribute('open');
	}

	async function runAction(name: string, operation: () => Promise<void>, message: string) {
		busyAction = name;
		try {
			await operation();
			await onAction?.(message, true, 'success');
		} catch (caught) {
			await onAction?.(
				caught instanceof Error ? caught.message : 'The action could not be completed.',
				false,
				'warning'
			);
		} finally {
			busyAction = '';
		}
	}

	function toggleFavorite() {
		void runAction(
			'favorite',
			() =>
				apiAction(resolve('/api/v1/items/[id]/favorite', { id: item.id }), 'PUT', {
					favorite: !item.favorite
				}),
			item.favorite ? 'Removed from favorites.' : 'Added to favorites.'
		);
	}

	function toggleArchived() {
		closeMenu();
		void runAction(
			'archive',
			() =>
				apiAction(resolve('/api/v1/items/[id]/archived', { id: item.id }), 'PUT', {
					archived: !item.archived
				}),
			item.archived ? 'Item restored.' : 'Item archived.'
		);
	}

	function toggleReminder() {
		if (item.type !== 'reminder') return;
		void runAction(
			'completion',
			() =>
				apiAction(resolve('/api/v1/reminders/[id]/completion', { id: item.id }), 'PUT', {
					completed: item.reminderState !== 'completed'
				}),
			item.reminderState === 'completed'
				? 'Reminder reopened.'
				: item.recurrence
					? 'Reminder moved to its next occurrence.'
					: 'Reminder completed.'
		);
	}

	function openEdit() {
		closeMenu();
		editOpen = true;
	}

	function openShare() {
		closeMenu();
		shareOpen = true;
	}

	function confirmDelete() {
		closeMenu();
		deleteOpen = true;
	}

	function deleteItem() {
		void runAction(
			'delete',
			async () => {
				await apiAction(resolve('/api/v1/items/[id]', { id: item.id }), 'DELETE');
				deleteOpen = false;
			},
			'Item deleted.'
		);
	}
</script>

<article class:compact class:selected class={`item-card item-card--${item.type}`}>
	<div class="item-card__selection">
		<input
			type="checkbox"
			checked={selected}
			aria-label={`Select ${displayTitle}`}
			onchange={(event) => onSelect?.(item.id, event.currentTarget.checked)}
		/>
	</div>
	<div class="item-card__body">
		<header class="item-card__top">
			<div class="item-card__meta">
				<span class="item-card__kind">
					{#if faviconUrl && item.type === 'link'}
						<img class="item-card__favicon" src={faviconUrl} alt="" width="16" height="16" />
					{:else}
						<AppIcon name={item.type === 'reminder' ? 'bell' : item.type} size={15} />
					{/if}
					{item.type}
				</span>
				{#if item.domain}<span>{item.domain}</span>{/if}
				{#if metadataState === 'pending' || metadataState === 'fetching'}
					<span class="metadata-pending">Fetching details</span>
				{:else if metadataState === 'failed' || metadataState === 'blocked'}
					<span class="metadata-unavailable">Details unavailable</span>
				{/if}
			</div>
			<div class="item-card__actions" aria-label={`Quick actions for ${displayTitle}`}>
				<button
					type="button"
					class:active={item.favorite}
					disabled={Boolean(busyAction)}
					aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
					title={item.favorite ? 'Remove favorite' : 'Favorite'}
					onclick={toggleFavorite}
				>
					<AppIcon name="star" size={16} />
				</button>
				{#if item.type === 'reminder'}
					<button
						type="button"
						class:active={item.reminderState === 'completed'}
						disabled={Boolean(busyAction)}
						aria-label={item.reminderState === 'completed'
							? 'Reopen reminder'
							: 'Complete reminder'}
						title={item.reminderState === 'completed' ? 'Reopen' : 'Complete'}
						onclick={toggleReminder}
					>
						<AppIcon name="check" size={16} />
					</button>
				{/if}
				<details class="action-menu" bind:this={actionMenu}>
					<summary aria-label="More item actions" title="More actions">
						<AppIcon name="more" size={18} />
					</summary>
					<div class="action-menu__panel">
						<button type="button" disabled={Boolean(busyAction)} onclick={openEdit}>
							<AppIcon name="edit" size={16} /> Edit
						</button>
						<button type="button" disabled={Boolean(busyAction)} onclick={toggleArchived}>
							<AppIcon name="archive" size={16} />
							{item.archived ? 'Restore' : 'Archive'}
						</button>
						<button type="button" disabled={Boolean(busyAction)} onclick={openShare}>
							<AppIcon name="share" size={16} /> Share
						</button>
						<button
							class="danger-action"
							type="button"
							disabled={Boolean(busyAction)}
							onclick={confirmDelete}
						>
							<AppIcon name="trash" size={16} /> Delete
						</button>
					</div>
				</details>
			</div>
		</header>

		{#if item.type === 'link' && previewUrl && !compact}
			<img class="item-card__preview" src={previewUrl} alt="" loading="lazy" />
		{/if}

		<h2>
			{#each titleParts as part, index (`${part.text}-${index}`)}
				{#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}
			{/each}
		</h2>
		{#if item.type === 'note' && item.noteBody}
			<SafeMarkdown source={item.noteBody} {query} compact label="Note content" />
		{:else if displayDescription}
			<p class="item-card__description">
				{#each descriptionParts as part, index (`${part.text}-${index}`)}
					{#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}
				{/each}
			</p>
		{/if}

		{#if item.type === 'link' && item.originalUrl}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a class="item-card__url" href={item.originalUrl} target="_blank" rel="noreferrer">
				<span>{item.originalUrl}</span><span aria-hidden="true">↗</span>
			</a>
		{/if}

		<footer>
			<div class="item-card__labels">
				{#if item.favorite}<span class="favorite"><AppIcon name="star" size={13} /> Favorite</span
					>{/if}
				{#if item.archived}<span class="status-label">Archived</span>{/if}
				{#if item.reminderState === 'completed'}<span class="status-label">Completed</span>{/if}
				{#if item.collectionName}
					<span class="collection" style:--label-color={item.collectionColor ?? '#d8ff78'}
						>{item.collectionName}</span
					>
				{/if}
				{#each item.tags.slice(0, compact ? 2 : 4) as tag (tag.id)}
					<span class="tag" style:--label-color={tag.color ?? '#e7dfd3'}>{tag.name}</span>
				{/each}
			</div>
			<time datetime={(item.dueAt ?? item.createdAt).toISOString()}>
				{item.type === 'reminder' ? 'Due ' : 'Saved '}{formatDate(item.dueAt ?? item.createdAt)}
			</time>
		</footer>
	</div>
</article>

<ItemEditDialog
	bind:open={editOpen}
	{item}
	{collections}
	{tags}
	onSaved={(message) => onAction?.(message, true, 'success')}
/>
<ItemShareDialog
	bind:open={shareOpen}
	{item}
	onMessage={(message) => onAction?.(message, false, 'success')}
/>
<Dialog
	bind:open={deleteOpen}
	title={`Delete ${item.type}?`}
	description={`Permanently remove “${displayTitle}” and its saved details.`}
	dismissible={busyAction !== 'delete'}
>
	<div class="delete-confirmation">
		<p>This cannot be undone. Any active share URLs for this item will stop working.</p>
		<div>
			<Button
				variant="quiet"
				size="small"
				disabled={busyAction === 'delete'}
				onclick={() => (deleteOpen = false)}>Keep item</Button
			>
			<Button
				size="small"
				loading={busyAction === 'delete'}
				loadingLabel="Deleting item"
				onclick={deleteItem}>Delete permanently</Button
			>
		</div>
	</div>
</Dialog>

<style>
	.item-card {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		min-height: 17rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-canvas);
		transition:
			transform var(--motion-standard) var(--ease-out),
			box-shadow var(--motion-standard) var(--ease-out),
			border-color var(--motion-fast) var(--ease-out);
	}

	.item-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 1.1rem 2.8rem rgb(18 22 19 / 8%);
	}

	.item-card:has(.action-menu[open]) {
		z-index: 12;
	}

	.item-card.selected {
		border-color: var(--color-press-black);
		box-shadow: inset 0 0 0 1px var(--color-press-black);
	}

	.item-card--reminder {
		background: color-mix(in srgb, var(--surface-accent) 16%, var(--surface-canvas));
	}

	.item-card__selection {
		padding: 1.25rem 0 0 1.25rem;
	}

	.item-card__selection input {
		width: 1.2rem;
		height: 1.2rem;
		accent-color: var(--color-press-black);
	}

	.item-card__body {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: var(--space-3-75);
		padding: 1.25rem;
	}

	.item-card__top {
		display: flex;
		min-width: 0;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.65rem;
	}

	.item-card__meta,
	.item-card footer,
	.item-card__labels,
	.item-card__kind,
	.item-card__url {
		display: flex;
		align-items: center;
	}

	.item-card__meta {
		min-width: 0;
		flex-wrap: wrap;
		gap: 0.5rem 0.9rem;
		color: var(--text-muted);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.item-card__kind {
		gap: 0.35rem;
		color: var(--text-primary);
		font-weight: var(--font-weight-medium);
	}

	.item-card__favicon {
		width: 1rem;
		height: 1rem;
		border-radius: 0.2rem;
		object-fit: contain;
	}

	.item-card__preview {
		width: 100%;
		aspect-ratio: 16 / 9;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: calc(var(--radius-image) * 0.55);
		background: var(--surface-subtle);
		object-fit: cover;
	}

	.item-card__actions {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.25rem;
	}

	.item-card__actions > button,
	.action-menu summary {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--surface-canvas) 88%, transparent);
		color: inherit;
	}

	.item-card__actions > button.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.item-card__actions button:disabled {
		opacity: 0.45;
	}

	.action-menu {
		position: relative;
	}

	.action-menu summary {
		cursor: pointer;
		list-style: none;
	}

	.action-menu summary::-webkit-details-marker {
		display: none;
	}

	.action-menu[open] summary {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.action-menu__panel {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		z-index: 4;
		display: grid;
		width: 11.5rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		box-shadow: 0 1rem 2.5rem rgb(18 22 19 / 16%);
		padding: 0.35rem;
	}

	.action-menu__panel button {
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.65rem;
		border: 0;
		border-radius: calc(var(--radius-control) * 0.72);
		background: transparent;
		color: inherit;
		padding: 0.65rem 0.75rem;
		font: inherit;
		font-size: var(--text-body-small);
		text-align: left;
	}

	.action-menu__panel button:hover,
	.action-menu__panel button:focus-visible {
		background: var(--surface-subtle);
	}

	.action-menu__panel .danger-action {
		margin-top: 0.25rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		border-radius: 0 0 calc(var(--radius-control) * 0.72) calc(var(--radius-control) * 0.72);
	}

	.metadata-pending::before {
		display: inline-block;
		width: 0.4rem;
		height: 0.4rem;
		margin-right: 0.4rem;
		border-radius: 50%;
		background: var(--surface-accent);
		content: '';
		animation: pulse 1.4s ease-in-out infinite;
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		display: -webkit-box;
		overflow: hidden;
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3vw, 2.35rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.035em;
		line-height: 1;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	mark {
		border-radius: 0.15em;
		background: color-mix(in srgb, var(--surface-accent) 72%, transparent);
		color: inherit;
		padding: 0 0.06em;
	}

	.item-card__description {
		display: -webkit-box;
		overflow: hidden;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.item-card__url {
		min-width: 0;
		justify-content: space-between;
		gap: 1rem;
		color: inherit;
		font-size: var(--text-body-small);
		text-decoration: none;
	}

	.item-card__url span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-card footer {
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: auto;
		padding-top: var(--space-3-75);
		border-top: var(--border-hairline) solid var(--border-subtle);
	}

	.item-card__labels {
		min-width: 0;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.item-card__labels span {
		border-radius: var(--radius-full);
		background: var(--label-color, var(--surface-subtle));
		padding: 0.28rem 0.55rem;
		font-size: 0.67rem;
		line-height: 1;
	}

	.item-card__labels .favorite {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: transparent;
		padding-left: 0;
	}

	.item-card__labels .status-label {
		border: var(--border-hairline) solid var(--border-default);
		background: transparent;
	}

	.delete-confirmation {
		display: grid;
		gap: var(--space-5);
	}

	.delete-confirmation p {
		color: var(--text-muted);
		font-size: var(--text-body-compact);
		line-height: var(--leading-body-compact);
	}

	.delete-confirmation > div {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.65rem;
		padding-top: var(--space-3-75);
		border-top: var(--border-hairline) solid var(--border-subtle);
	}

	time {
		flex: 0 0 auto;
		color: var(--text-muted);
		font-size: 0.7rem;
	}

	.item-card.compact {
		min-height: auto;
		border-width: 0 0 var(--border-hairline);
		border-radius: 0;
	}

	.item-card.compact:hover {
		box-shadow: none;
		transform: none;
	}

	.item-card.compact .item-card__body {
		display: grid;
		grid-template-columns: minmax(11rem, 1fr) minmax(10rem, 0.7fr) auto;
		align-items: center;
	}

	.item-card.compact .item-card__top {
		grid-column: 3;
		grid-row: 1;
	}

	.item-card.compact .item-card__meta {
		display: none;
	}

	.item-card.compact h2 {
		grid-column: 1;
		grid-row: 1;
		font-size: 1.35rem;
	}

	.item-card.compact .item-card__description,
	.item-card.compact .item-card__url,
	.item-card.compact .item-card__preview {
		display: none;
	}

	.item-card.compact footer {
		grid-column: 2;
		grid-row: 1;
		margin: 0;
		padding: 0;
		border: 0;
	}

	@keyframes pulse {
		50% {
			opacity: 0.3;
			transform: scale(0.72);
		}
	}

	@media (max-width: 44rem) {
		.item-card.compact .item-card__body {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.item-card.compact .item-card__top {
			grid-column: 2;
			grid-row: 1;
		}

		.item-card.compact footer {
			grid-column: 1 / -1;
			grid-row: 2;
			padding-top: 0.75rem;
		}
	}
</style>
