<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import type { LibraryCollection, LibraryTag } from './types';

	let {
		open = $bindable(false),
		collections,
		tags
	}: {
		open?: boolean;
		collections: LibraryCollection[];
		tags: LibraryTag[];
	} = $props();

	let kind = $state<'link' | 'note' | 'reminder'>('link');
	let currentTimeZone = $derived(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	const dashboardPath = resolve('/app');
</script>

<Dialog bind:open title="Save something" description="A link, a thought, or a nudge for later.">
	<div class="kind-tabs" role="tablist" aria-label="Item type">
		{#each ['link', 'note', 'reminder'] as option (option)}
			<button
				type="button"
				role="tab"
				aria-selected={kind === option}
				class:active={kind === option}
				onclick={() => (kind = option as typeof kind)}>{option}</button
			>
		{/each}
	</div>

	{#if kind === 'link'}
		<form method="POST" action={`${dashboardPath}?/createLink`}>
			<Input label="URL" name="url" type="url" placeholder="https://example.com" required />
			<Input label="Title" name="title" description="Optional. Metadata can fill this later." />
			<Textarea label="Personal notes" name="personalNotes" rows={3} />
			{@render sharedFields()}
			<Button type="submit" fullWidth>Save link</Button>
		</form>
	{:else if kind === 'note'}
		<form method="POST" action={`${dashboardPath}?/createNote`}>
			<Input label="Title" name="title" description="Optional" />
			<Textarea label="Note" name="body" rows={8} required />
			{@render sharedFields()}
			<Button type="submit" fullWidth>Save note</Button>
		</form>
	{:else}
		<form method="POST" action={`${dashboardPath}?/createReminder`}>
			<Input label="What should you remember?" name="title" required />
			<Textarea label="Details" name="description" rows={3} />
			<Input label="Date and time" name="dueAt" type="datetime-local" required />
			<Input label="Repeat" name="recurrence" description="Optional, for example every Monday" />
			<input type="hidden" name="timeZone" value={currentTimeZone} />
			{@render sharedFields()}
			<Button type="submit" fullWidth>Save reminder</Button>
		</form>
	{/if}
</Dialog>

{#snippet sharedFields()}
	<div class="field">
		<label for="quick-collection">Collection</label>
		<select id="quick-collection" name="collectionId">
			<option value="">Unorganized</option>
			{#each collections as collection (collection.id)}
				<option value={collection.id}>{collection.name}</option>
			{/each}
		</select>
	</div>
	{#if tags.length}
		<fieldset>
			<legend>Tags</legend>
			<div class="tag-options">
				{#each tags as tag (tag.id)}
					<label
						><input type="checkbox" name="tagIds" value={tag.id} /> <span>{tag.name}</span></label
					>
				{/each}
			</div>
		</fieldset>
	{/if}
{/snippet}

<style>
	.kind-tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.35rem;
		margin-bottom: var(--space-5);
		border-radius: var(--radius-control);
		background: var(--surface-subtle);
		padding: 0.35rem;
	}

	.kind-tabs button {
		min-height: 2.75rem;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.kind-tabs button.active {
		background: var(--surface-canvas);
		box-shadow: 0 0.2rem 0.8rem rgb(18 22 19 / 7%);
	}

	form {
		display: grid;
		gap: var(--space-5);
	}

	.field {
		display: grid;
		gap: 0.5rem;
	}

	.field label,
	legend {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	select {
		width: 100%;
		min-height: 3.25rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0 1rem;
	}

	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		margin-bottom: 0.65rem;
	}

	.tag-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.tag-options label {
		position: relative;
	}

	.tag-options input {
		position: absolute;
		opacity: 0;
	}

	.tag-options span {
		display: inline-flex;
		min-height: 2.5rem;
		align-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-full);
		padding: 0.55rem 0.8rem;
		font-size: var(--text-body-small);
	}

	.tag-options input:checked + span {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.tag-options input:focus-visible + span {
		outline: 3px solid var(--focus-ring);
		outline-offset: 2px;
	}
</style>
