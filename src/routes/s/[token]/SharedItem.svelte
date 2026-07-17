<script lang="ts">
	import SafeMarkdown from '$lib/components/ui/SafeMarkdown.svelte';

	interface SharedItem {
		type: 'link' | 'note' | 'reminder';
		title: string | null;
		description: string | null;
		createdAt: Date;
		link?: {
			url: string;
			domain: string;
			metadataTitle: string | null;
			metadataDescription: string | null;
			siteName: string | null;
		};
		note?: { body: string };
		reminder?: {
			description: string | null;
			dueAt: Date;
			state: 'pending' | 'completed';
			recurrence: string | null;
			timeZone: string;
		};
	}

	let { item }: { item: SharedItem } = $props();

	function dateLabel(value: Date, timeZone?: string): string {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
			...(timeZone ? { timeZone } : {})
		}).format(value);
	}
</script>

<article class="shared-item">
	<header>
		<span class="type-label">{item.type}</span>
		<time datetime={item.createdAt.toISOString()}>{dateLabel(item.createdAt)}</time>
	</header>

	{#if item.type === 'link' && item.link}
		<h2>{item.title ?? item.link.metadataTitle ?? item.link.domain}</h2>
		{#if item.description ?? item.link.metadataDescription}
			<p>{item.description ?? item.link.metadataDescription}</p>
		{/if}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={item.link.url} target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">
			<span>{item.link.siteName ?? item.link.domain}</span>
			<span aria-hidden="true">&#8599;</span>
		</a>
	{:else if item.type === 'note' && item.note}
		<h2>{item.title ?? 'Note'}</h2>
		{#if item.description}<p>{item.description}</p>{/if}
		<div class="note-body">
			<SafeMarkdown source={item.note.body} label="Shared note content" />
		</div>
	{:else if item.type === 'reminder' && item.reminder}
		<h2>{item.title ?? 'Reminder'}</h2>
		{#if item.description ?? item.reminder.description}
			<p>{item.description ?? item.reminder.description}</p>
		{/if}
		<div class="due-row">
			<span class:complete={item.reminder.state === 'completed'}>{item.reminder.state}</span>
			<time datetime={item.reminder.dueAt.toISOString()}>
				{dateLabel(item.reminder.dueAt, item.reminder.timeZone)}
			</time>
		</div>
		{#if item.reminder.recurrence}
			<p class="recurrence">Repeats: {item.reminder.recurrence}</p>
		{/if}
	{/if}
</article>

<style>
	.shared-item {
		display: grid;
		gap: 1rem;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--color-border, #232924);
		background: var(--color-canvas, #fafffa);
	}

	header,
	.due-row,
	a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	header time,
	.type-label {
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted, #516254);
	}

	h2,
	p,
	.note-body {
		margin: 0;
	}

	h2 {
		font-family: var(--font-display, Georgia, serif);
		font-size: clamp(1.35rem, 3vw, 2rem);
		line-height: 1.08;
	}

	p,
	.note-body {
		line-height: 1.55;
	}

	.note-body {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	a {
		min-height: 2.75rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--color-border, #232924);
		color: inherit;
		font-weight: 650;
		text-decoration-thickness: 0.12em;
		text-underline-offset: 0.2em;
		overflow-wrap: anywhere;
	}

	.due-row {
		flex-wrap: wrap;
		padding-top: 0.85rem;
		border-top: 1px solid var(--color-border, #232924);
		font-size: 0.875rem;
	}

	.recurrence {
		font-size: 0.875rem;
		color: var(--color-muted, #516254);
	}

	.due-row span {
		padding: 0.3rem 0.55rem;
		background: var(--color-accent, #2bee4b);
		text-transform: capitalize;
	}

	.due-row span.complete {
		background: var(--color-tint, #c4e4c9);
	}
</style>
