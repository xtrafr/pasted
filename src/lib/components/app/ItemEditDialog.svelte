<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import type { LibraryCollection, LibraryItem, LibraryTag } from './types';

	type Props = {
		open?: boolean;
		item: LibraryItem;
		collections: LibraryCollection[];
		tags: LibraryTag[];
		onSaved?: (message: string) => void | Promise<void>;
	};

	let { open = $bindable(false), item, collections, tags, onSaved }: Props = $props();

	let title = $state('');
	let description = $state('');
	let url = $state('');
	let personalNotes = $state('');
	let noteBody = $state('');
	let dueAt = $state('');
	let recurrence = $state('');
	let collectionId = $state('');
	let selectedTagIds = $state<string[]>([]);
	let saving = $state(false);
	let error = $state('');
	let wasOpen = false;

	function toLocalDateTime(value: Date | string | null): string {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		const pad = (part: number) => String(part).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function resetFields() {
		title = item.title ?? '';
		description =
			item.type === 'reminder' ? (item.reminderDescription ?? '') : (item.description ?? '');
		url = item.originalUrl ?? '';
		personalNotes = item.personalNotes ?? '';
		noteBody = item.noteBody ?? '';
		dueAt = toLocalDateTime(item.dueAt);
		recurrence = item.recurrence ?? '';
		collectionId = item.collectionId ?? '';
		selectedTagIds = item.tags.map((tag) => tag.id);
		error = '';
	}

	$effect(() => {
		if (open && !wasOpen) resetFields();
		wasOpen = open;
	});

	function toggleTag(tagId: string, checked: boolean) {
		selectedTagIds = checked
			? [...new Set([...selectedTagIds, tagId])]
			: selectedTagIds.filter((id) => id !== tagId);
	}

	function itemEndpoint(): string {
		switch (item.type) {
			case 'link':
				return resolve('/api/v1/links/[id]', { id: item.id });
			case 'note':
				return resolve('/api/v1/notes/[id]', { id: item.id });
			case 'reminder':
				return resolve('/api/v1/reminders/[id]', { id: item.id });
		}
	}

	function optional(value: string): string | null {
		return value.trim() || null;
	}

	function requestBody(): Record<string, unknown> {
		const common = {
			collectionId: collectionId || null,
			tagIds: selectedTagIds
		};
		if (item.type === 'link') {
			return {
				...common,
				originalUrl: url.trim(),
				title: optional(title),
				description: optional(description),
				personalNotes: optional(personalNotes)
			};
		}
		if (item.type === 'note') {
			return { ...common, title: optional(title), body: noteBody.trim() };
		}
		return {
			...common,
			title: title.trim(),
			description: optional(description),
			dueAt: new Date(dueAt).toISOString(),
			recurrence: optional(recurrence),
			timeZone: item.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
		};
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (item.type === 'reminder' && (!dueAt || Number.isNaN(new Date(dueAt).getTime()))) {
			error = 'Choose a valid due date and time.';
			return;
		}
		saving = true;
		try {
			const response = await fetch(itemEndpoint(), {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(requestBody())
			});
			const payload = (await response.json()) as {
				ok: boolean;
				error?: { message?: string };
			};
			if (!response.ok || !payload.ok) {
				throw new Error(payload.error?.message ?? 'The item could not be saved.');
			}
			open = false;
			await onSaved?.(`${item.type[0]?.toUpperCase()}${item.type.slice(1)} updated.`);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'The item could not be saved.';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={`Edit ${item.type}`}
	description="Change the saved details, collection, and tags."
	dismissible={!saving}
>
	<form class="edit-form" onsubmit={save}>
		{#if item.type === 'link'}
			<Input label="URL" type="url" required maxlength={8192} bind:value={url} />
			<Input label="Title" maxlength={300} bind:value={title} placeholder="Use page title" />
			<Textarea label="Description" maxlength={2000} rows={3} bind:value={description} />
			<Textarea label="Personal notes" maxlength={20000} rows={4} bind:value={personalNotes} />
		{:else if item.type === 'note'}
			<Input label="Title" maxlength={300} bind:value={title} placeholder="Untitled note" />
			<Textarea label="Note" required maxlength={100000} rows={9} bind:value={noteBody} />
		{:else}
			<Input label="Title" required maxlength={300} bind:value={title} />
			<Textarea label="Description" maxlength={2000} rows={4} bind:value={description} />
			<Input label="Due date and time" type="datetime-local" required bind:value={dueAt} />
			<Input
				label="Recurrence"
				maxlength={500}
				bind:value={recurrence}
				placeholder="Optional recurrence rule"
			/>
		{/if}

		<label class="select-field">
			<span>Collection</span>
			<select bind:value={collectionId}>
				<option value="">No collection</option>
				{#each collections as collection (collection.id)}
					<option value={collection.id}>{collection.name}</option>
				{/each}
			</select>
		</label>

		{#if tags.length}
			<fieldset class="tag-fieldset">
				<legend>Tags</legend>
				<div class="tag-options">
					{#each tags as tag (tag.id)}
						<label>
							<input
								type="checkbox"
								checked={selectedTagIds.includes(tag.id)}
								onchange={(event) => toggleTag(tag.id, event.currentTarget.checked)}
							/>
							<span style:--tag-color={tag.color ?? '#e7dfd3'}>{tag.name}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		{/if}

		{#if error}<p class="form-error" role="alert">{error}</p>{/if}
		<div class="form-actions">
			<Button variant="quiet" size="small" disabled={saving} onclick={() => (open = false)}
				>Cancel</Button
			>
			<Button type="submit" size="small" loading={saving} loadingLabel="Saving item"
				>Save changes</Button
			>
		</div>
	</form>
</Dialog>

<style>
	.edit-form {
		display: grid;
		gap: var(--space-5);
	}

	.select-field {
		display: grid;
		gap: 0.5rem;
	}

	.select-field > span,
	legend {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	select {
		width: 100%;
		min-height: 3rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0 0.875rem;
	}

	.tag-fieldset {
		margin: 0;
		border: 0;
		padding: 0;
	}

	.tag-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.65rem;
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
		padding: 0.5rem 0.8rem;
		font-size: var(--text-body-small);
	}

	.tag-options input:checked + span {
		background: var(--tag-color);
		box-shadow: inset 0 0 0 1px var(--color-press-black);
	}

	.tag-options input:focus-visible + span {
		outline: 3px solid var(--focus-ring);
		outline-offset: 2px;
	}

	.form-error {
		margin: 0;
		border-left: 3px solid var(--color-press-black);
		padding-left: 0.75rem;
		font-size: var(--text-body-small);
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.6rem;
		padding-top: var(--space-3-75);
		border-top: var(--border-hairline) solid var(--border-subtle);
	}
</style>
