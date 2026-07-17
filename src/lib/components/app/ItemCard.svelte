<script lang="ts">
	import AppIcon from './AppIcon.svelte';
	import type { LibraryItem } from './types';

	let {
		item,
		selected = false,
		compact = false,
		onSelect
	}: {
		item: LibraryItem;
		selected?: boolean;
		compact?: boolean;
		onSelect?: (id: string, selected: boolean) => void;
	} = $props();

	const displayTitle = $derived(
		item.title ??
			item.metadataTitle ??
			(item.type === 'note' ? 'Untitled note' : (item.domain ?? 'Saved item'))
	);
	const displayDescription = $derived(
		item.type === 'note'
			? item.noteBody
			: item.type === 'reminder'
				? item.reminderDescription
				: (item.description ?? item.metadataDescription)
	);

	function formatDate(value: Date | null): string {
		if (!value) return '';
		return new Intl.DateTimeFormat('en', {
			month: 'short',
			day: 'numeric',
			year: value.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
		}).format(value);
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
		<header class="item-card__meta">
			<span class="item-card__kind"
				><AppIcon name={item.type === 'reminder' ? 'bell' : item.type} size={15} />{item.type}</span
			>
			{#if item.domain}<span>{item.domain}</span>{/if}
			{#if item.metadataState === 'pending' || item.metadataState === 'fetching'}
				<span class="metadata-pending">Fetching details</span>
			{/if}
		</header>

		<h2>{displayTitle}</h2>
		{#if displayDescription}
			<p class="item-card__description">{displayDescription}</p>
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

	.item-card__meta,
	.item-card footer,
	.item-card__labels,
	.item-card__kind,
	.item-card__url {
		display: flex;
		align-items: center;
	}

	.item-card__meta {
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

	.item-card.compact h2 {
		font-size: 1.35rem;
	}

	.item-card.compact .item-card__description,
	.item-card.compact .item-card__url {
		display: none;
	}

	.item-card.compact footer {
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
			display: flex;
		}
		.item-card.compact .item-card__meta {
			order: -1;
		}
	}
</style>
