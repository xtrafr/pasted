<script lang="ts">
	import { resolve } from '$app/paths';
	import AppIcon from '$lib/components/app/AppIcon.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
	import type { PageData } from './$types';

	type Format =
		'pasted-json' | 'simple-json' | 'csv' | 'txt' | 'markdown' | 'netscape-bookmarks' | 'zip';
	type Scope = 'all' | 'collection' | 'domain' | 'favorites' | 'reminders' | 'date' | 'manual';

	let { data }: { data: PageData } = $props();
	let format = $state<Format>('pasted-json');
	let scope = $state<Scope>('all');
	let collectionId = $state('');
	let domain = $state('');
	let createdFrom = $state('');
	let createdTo = $state('');
	let includePersonalNotes = $state(true);
	let includeSourceDates = $state(true);
	let includeLinkMetadata = $state(true);
	let includeNoteBodies = $state(true);
	let includeReminderDescriptions = $state(true);
	let includeTitlesInTxt = $state(true);
	let downloading = $state(false);
	let progress = $state(0);
	let errorMessage = $state('');
	let successMessage = $state('');

	const formats: Array<{
		value: Format;
		label: string;
		extension: string;
		description: string;
		bytesPerItem: number;
	}> = [
		{
			value: 'pasted-json',
			label: 'Pasted JSON',
			extension: '.pasted.json',
			description: 'Versioned and fully restorable.',
			bytesPerItem: 950
		},
		{
			value: 'simple-json',
			label: 'Simple JSON',
			extension: '.json',
			description: 'A straightforward array for other apps.',
			bytesPerItem: 620
		},
		{
			value: 'csv',
			label: 'CSV',
			extension: '.csv',
			description: 'Clear columns for spreadsheets.',
			bytesPerItem: 320
		},
		{
			value: 'txt',
			label: 'Plain text',
			extension: '.txt',
			description: 'One URL per line, optionally titled.',
			bytesPerItem: 110
		},
		{
			value: 'markdown',
			label: 'Markdown',
			extension: '.md',
			description: 'Readable lists grouped by collection.',
			bytesPerItem: 210
		},
		{
			value: 'netscape-bookmarks',
			label: 'Browser bookmarks',
			extension: '.html',
			description: 'Imports into Chrome, Firefox, Safari, and Edge.',
			bytesPerItem: 280
		},
		{
			value: 'zip',
			label: 'Backup ZIP',
			extension: '.zip',
			description: 'Versioned JSON plus a short restore guide.',
			bytesPerItem: 520
		}
	];
	const scopes = $derived<Array<{ value: Scope; label: string; description: string }>>([
		{
			value: 'all',
			label: 'Entire account',
			description: 'Every link, note, reminder, collection, and tag.'
		},
		{
			value: 'collection',
			label: 'One collection',
			description: 'Everything organized in a chosen collection.'
		},
		{ value: 'domain', label: 'One domain', description: 'Links from a single website.' },
		{
			value: 'favorites',
			label: 'Favorites',
			description: 'Only the items you marked for quick return.'
		},
		{ value: 'reminders', label: 'Reminders', description: 'Pending and completed reminders.' },
		{ value: 'date', label: 'Date range', description: 'Items created between two dates.' },
		...(data.itemIds.length
			? [
					{
						value: 'manual' as const,
						label: 'Current selection',
						description: `${data.itemIds.length} items selected in the library.`
					}
				]
			: [])
	]);
	const selectedFormat = $derived(formats.find((entry) => entry.value === format) ?? formats[0]!);
	const estimatedCount = $derived.by(() => {
		switch (scope) {
			case 'manual':
				return data.itemIds.length;
			case 'collection':
				return data.overview.collections.find((entry) => entry.id === collectionId)?.count ?? 0;
			case 'domain':
				return data.overview.domains.find((entry) => entry.name === domain)?.count ?? 0;
			case 'favorites':
				return data.overview.favoriteCount;
			case 'reminders':
				return data.overview.reminderCount;
			case 'date':
				return data.overview.total;
			default:
				return data.overview.total;
		}
	});
	const estimatedBytes = $derived(
		Math.max(
			180,
			Math.round(estimatedCount * selectedFormat.bytesPerItem * (format === 'zip' ? 0.58 : 1))
		)
	);

	function humanBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function isoBoundary(value: string, end = false): string | undefined {
		if (!value) return undefined;
		return new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`).toISOString();
	}

	function downloadFilename(response: Response): string {
		const disposition = response.headers.get('content-disposition') ?? '';
		return (
			/filename="([^"]+)"/.exec(disposition)?.[1] ?? `pasted-export${selectedFormat.extension}`
		);
	}

	async function download() {
		errorMessage = '';
		successMessage = '';
		if (scope === 'collection' && !collectionId) {
			errorMessage = 'Choose a collection first.';
			return;
		}
		if (scope === 'domain' && !domain) {
			errorMessage = 'Choose a domain first.';
			return;
		}
		downloading = true;
		progress = 18;
		try {
			const response = await fetch(resolve('/api/v1/exports'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					format,
					scope,
					...(scope === 'collection' ? { collectionId: collectionId || null } : {}),
					...(scope === 'domain' ? { domain } : {}),
					...(scope === 'date'
						? { createdFrom: isoBoundary(createdFrom), createdTo: isoBoundary(createdTo, true) }
						: {}),
					...(scope === 'manual' ? { itemIds: data.itemIds } : {}),
					privacy: {
						includePersonalNotes,
						includeSourceDates,
						includeLinkMetadata,
						includeNoteBodies,
						includeReminderDescriptions
					},
					includeTitlesInTxt
				})
			});
			progress = 72;
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error?.message ?? 'The export could not be prepared.');
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = downloadFilename(response);
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 2_000);
			progress = 100;
			successMessage = `${response.headers.get('x-pasted-item-count') ?? estimatedCount} items exported as ${selectedFormat.label}.`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'The export could not be prepared.';
		} finally {
			downloading = false;
		}
	}
</script>

<svelte:head>
	<title>Export | Pasted</title>
	<meta
		name="description"
		content="Export a complete Pasted backup or portable JSON, CSV, text, Markdown, and browser bookmarks."
	/>
</svelte:head>

<main class="export-page">
	<header class="export-head">
		<a href={resolve('/app')}><span aria-hidden="true">←</span> Library</a>
		<p>Portable by design</p>
		<h1>Your library has an exit.</h1>
		<p>Download all of it or just the useful slice. No lock-in, no external export service.</p>
	</header>

	<section class="export-grid">
		<div class="export-builder">
			<section aria-labelledby="scope-title">
				<p class="section-number">01</p>
				<h2 id="scope-title">Choose the slice.</h2>
				<div class="scope-grid">
					{#each scopes as option (option.value)}
						<label class:active={scope === option.value}>
							<input type="radio" name="scope" value={option.value} bind:group={scope} />
							<strong>{option.label}</strong><span>{option.description}</span>
						</label>
					{/each}
				</div>
				{#if scope === 'collection'}
					<label class="select-field"
						>Collection<select bind:value={collectionId}
							><option value="">Choose one</option
							>{#each data.overview.collections as collection (collection.id)}<option
									value={collection.id}>{collection.name} ({collection.count})</option
								>{/each}</select
						></label
					>
				{:else if scope === 'domain'}
					<label class="select-field"
						>Domain<select bind:value={domain}
							><option value="">Choose one</option
							>{#each data.overview.domains as entry (entry.name)}<option value={entry.name}
									>{entry.name} ({entry.count})</option
								>{/each}</select
						></label
					>
				{:else if scope === 'date'}
					<div class="date-fields">
						<label>From<input type="date" bind:value={createdFrom} /></label><label
							>To<input type="date" bind:value={createdTo} /></label
						>
					</div>
				{/if}
			</section>

			<section aria-labelledby="format-title">
				<p class="section-number">02</p>
				<h2 id="format-title">Pick a format.</h2>
				<div class="format-grid">
					{#each formats as option (option.value)}
						<label class:active={format === option.value}>
							<input type="radio" name="format" value={option.value} bind:group={format} />
							<span class="extension">{option.extension}</span><strong>{option.label}</strong><span
								>{option.description}</span
							>
						</label>
					{/each}
				</div>
			</section>

			<section aria-labelledby="privacy-title">
				<p class="section-number">03</p>
				<h2 id="privacy-title">Set privacy.</h2>
				<div class="privacy-options">
					<label
						><input type="checkbox" bind:checked={includePersonalNotes} /><span
							><strong>Personal notes</strong><small>Notes attached to links</small></span
						></label
					>
					<label
						><input type="checkbox" bind:checked={includeNoteBodies} /><span
							><strong>Note contents</strong><small>The full text of saved notes</small></span
						></label
					>
					<label
						><input type="checkbox" bind:checked={includeReminderDescriptions} /><span
							><strong>Reminder details</strong><small>Descriptions and schedules</small></span
						></label
					>
					<label
						><input type="checkbox" bind:checked={includeSourceDates} /><span
							><strong>Original dates</strong><small>Detected source timestamps</small></span
						></label
					>
					<label
						><input type="checkbox" bind:checked={includeLinkMetadata} /><span
							><strong>Link metadata</strong><small>Titles, descriptions, and site names</small
							></span
						></label
					>
					{#if format === 'txt'}<label
							><input type="checkbox" bind:checked={includeTitlesInTxt} /><span
								><strong>Titles in TXT</strong><small>Write title before each URL</small></span
							></label
						>{/if}
				</div>
			</section>
		</div>

		<aside class="export-summary">
			<p class="section-number">Ready when you are</p>
			<div class="summary-count"><strong>{estimatedCount}</strong><span>items</span></div>
			<dl>
				<div>
					<dt>Format</dt>
					<dd>{selectedFormat.label}</dd>
				</div>
				<div>
					<dt>Estimated size</dt>
					<dd>{humanBytes(estimatedBytes)}</dd>
				</div>
				<div>
					<dt>Privacy</dt>
					<dd>
						{[
							includePersonalNotes,
							includeNoteBodies,
							includeReminderDescriptions,
							includeSourceDates,
							includeLinkMetadata
						].filter(Boolean).length} of 5 details
					</dd>
				</div>
			</dl>
			<div class="summary-note">
				<AppIcon name="check" />
				<p>The file is generated for your account and is never sent to a third party.</p>
			</div>
			{#if downloading || progress > 0}<Progress
					value={progress}
					label="Preparing download"
					showValue
				/>{/if}
			{#if errorMessage}<p class="message error" role="alert">{errorMessage}</p>{/if}
			{#if successMessage}<p class="message success" role="status">{successMessage}</p>{/if}
			<Button
				fullWidth
				onclick={download}
				loading={downloading}
				loadingLabel="Preparing export"
				disabled={estimatedCount === 0}>Download {selectedFormat.extension}</Button
			>
			<p class="restore-copy">
				Pasted JSON and ZIP backups can be restored from the import screen.
			</p>
		</aside>
	</section>
</main>

<style>
	.export-page {
		max-width: 92rem;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 5rem) var(--page-gutter) 7rem;
	}
	.export-head {
		display: grid;
		max-width: 68rem;
		gap: 0.8rem;
		margin-bottom: clamp(4rem, 9vw, 8rem);
	}
	.export-head a {
		width: fit-content;
		color: inherit;
		font-size: var(--text-body-small);
		text-decoration: none;
	}
	.export-head > p:first-of-type,
	.section-number {
		margin: 0;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}
	.export-head h1,
	.export-head p,
	h2 {
		margin: 0;
	}
	.export-head h1 {
		max-width: 11ch;
		font-family: var(--font-display);
		font-size: clamp(4rem, 11vw, 10rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.06em;
		line-height: 0.8;
	}
	.export-head > p:last-child {
		max-width: 50ch;
		color: var(--text-muted);
	}
	.export-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(19rem, 25rem);
		align-items: start;
		gap: clamp(3rem, 7vw, 8rem);
	}
	.export-builder {
		display: grid;
		gap: clamp(4rem, 8vw, 7rem);
	}
	.export-builder section {
		display: grid;
		gap: var(--space-5);
	}
	h2 {
		font-family: var(--font-display);
		font-size: clamp(3rem, 6vw, 5.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.05em;
		line-height: 0.88;
	}
	.scope-grid,
	.format-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.scope-grid label,
	.format-grid label {
		position: relative;
		display: grid;
		min-height: 8rem;
		align-content: start;
		gap: 0.45rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		padding: 1.2rem;
		transition:
			background-color var(--motion-fast) var(--ease-out),
			transform var(--motion-fast) var(--ease-out);
	}
	.scope-grid label:hover,
	.format-grid label:hover {
		transform: translateY(-2px);
	}
	.scope-grid label.active,
	.format-grid label.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}
	.scope-grid input,
	.format-grid input {
		position: absolute;
		inset: 0;
		opacity: 0;
	}
	.scope-grid strong,
	.format-grid strong {
		font-family: var(--font-display);
		font-size: 1.7rem;
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.025em;
	}
	.scope-grid span,
	.format-grid span:not(.extension) {
		color: inherit;
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
		opacity: 0.68;
	}
	.extension {
		width: fit-content;
		border: var(--border-hairline) solid currentColor;
		border-radius: var(--radius-full);
		padding: 0.25rem 0.5rem;
		font-size: 0.66rem;
	}
	.select-field,
	.date-fields label {
		display: grid;
		max-width: 38rem;
		gap: 0.5rem;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}
	select,
	.date-fields input {
		width: 100%;
		min-height: 3.25rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0 0.9rem;
	}
	.date-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		max-width: 38rem;
		gap: var(--space-3-75);
	}
	.privacy-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		border-top: var(--border-hairline) solid var(--border-default);
	}
	.privacy-options label {
		display: flex;
		min-height: 5rem;
		align-items: center;
		gap: 0.8rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 0.8rem 0;
	}
	.privacy-options input {
		width: 1.15rem;
		height: 1.15rem;
		accent-color: var(--color-press-black);
	}
	.privacy-options span {
		display: grid;
		gap: 0.2rem;
	}
	.privacy-options strong {
		font-size: var(--text-body-small);
	}
	.privacy-options small {
		color: var(--text-muted);
	}
	.export-summary {
		position: sticky;
		top: 1rem;
		display: grid;
		gap: var(--space-5);
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: color-mix(in srgb, var(--surface-accent) 8%, var(--surface-canvas));
		padding: 1.5rem;
	}
	.summary-count {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}
	.summary-count strong {
		font-family: var(--font-display);
		font-size: clamp(4rem, 8vw, 7rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.06em;
		line-height: 0.8;
	}
	.summary-count span {
		color: var(--text-muted);
	}
	dl {
		display: grid;
		margin: 0;
		border-block: var(--border-hairline) solid var(--border-default);
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 0;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
	}
	dl div:last-child {
		border: 0;
	}
	dt,
	dd {
		margin: 0;
		font-size: var(--text-body-small);
	}
	dt {
		color: var(--text-muted);
	}
	dd {
		text-align: right;
	}
	.summary-note {
		display: flex;
		gap: 0.7rem;
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		padding: 0.8rem;
	}
	.summary-note p,
	.restore-copy,
	.message {
		margin: 0;
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}
	.restore-copy {
		color: var(--text-muted);
		text-align: center;
	}
	.message {
		border-left: 3px solid var(--color-press-black);
		padding-left: 0.7rem;
	}
	.message.success {
		border-color: var(--surface-accent);
	}
	@media (max-width: 62rem) {
		.export-grid {
			grid-template-columns: 1fr;
		}
		.export-summary {
			position: static;
		}
	}
	@media (max-width: 40rem) {
		.scope-grid,
		.format-grid,
		.privacy-options,
		.date-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
