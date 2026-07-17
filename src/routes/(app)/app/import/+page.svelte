<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import AppIcon from '$lib/components/app/AppIcon.svelte';
	import ImportResultRow from '$lib/components/app/ImportResultRow.svelte';
	import type { LibraryCollection, LibraryTag } from '$lib/components/app/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import FileDropzone from '$lib/components/ui/FileDropzone.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { parsePastedBackupJson, parsePastedBackupZip, type PastedBackupV1 } from '$lib/export';
	import {
		detectImportFormat,
		inspectCsvColumns,
		parseImport,
		resolveImportLimits
	} from '$lib/import';
	import type {
		CsvColumn,
		ImportCandidate,
		ImportFormat,
		ImportInput,
		ImportResult,
		ParseImportOptions
	} from '$lib/import';
	import type { PageData } from './$types';

	type ImportResultState =
		'new' | 'duplicate_file' | 'duplicate_account' | 'invalid' | 'imported' | 'failed' | 'skipped';

	interface ImportSnapshot {
		id: string;
		state: 'reviewing' | 'importing' | 'completed' | 'cancelled' | 'failed';
		progress: {
			total: number;
			selected: number;
			pending: number;
			imported: number;
			failed: number;
			processed: number;
			percent: number;
		};
		results: Array<{
			candidateKey: string;
			state: ImportResultState;
			selected: boolean;
			errorCode: string | null;
		}>;
	}

	let { data }: { data: PageData } = $props();
	let step = $state<1 | 2 | 3 | 4>(1);
	let content = $state('');
	let files = $state<File[]>([]);
	let filename = $state('pasted-text.txt');
	let mimeType = $state('text/plain');
	let formatOverride = $state<ImportFormat | ''>('');
	let removeTracking = $state(true);
	let analyzing = $state(false);
	let analysisError = $state('');
	let result = $state<ImportResult>();
	let backup = $state.raw<PastedBackupV1>();
	let csvColumns = $state.raw<CsvColumn[]>([]);
	let restoringBackup = $state(false);
	let search = $state('');
	let domain = $state('');
	let groupByDomain = $state(false);
	let visibleLimit = $state(200);
	let selectedCollection = $state('');
	let collectionDialogOpen = $state(false);
	let collectionError = $state('');
	let importing = $state(false);
	let importProgress = $state(0);
	let importMessage = $state('');
	let importError = $state('');
	let importedCount = $state(0);
	let importSessionId = $state('');
	let snapshot = $state<ImportSnapshot>();
	let abortController: AbortController | undefined;
	let idempotencyKey = $state('');

	const selected = new SvelteSet<string>();
	const selectedCsvColumns = new SvelteSet<number>();
	const selectedTags = new SvelteSet<string>();
	const titles = new SvelteMap<string, string>();
	let createdCollections = $state<LibraryCollection[]>([]);
	const collections = $derived([
		...(data.collections as LibraryCollection[]),
		...createdCollections
	]);
	const tags = $derived(data.tags as LibraryTag[]);
	const domains = $derived(
		result
			? [...new Set(result.candidates.map((candidate) => candidate.domain).filter(Boolean))].sort()
			: []
	);
	const filteredCandidates = $derived.by(() => {
		if (!result) return [];
		const query = search.trim().toLowerCase();
		const candidates = result.candidates.filter(
			(candidate) =>
				(!domain || candidate.domain === domain) &&
				(!query ||
					candidate.displayUrl.toLowerCase().includes(query) ||
					candidate.domain?.toLowerCase().includes(query) ||
					titles.get(candidate.id)?.toLowerCase().includes(query))
		);
		return groupByDomain
			? candidates.toSorted((left, right) => (left.domain ?? '').localeCompare(right.domain ?? ''))
			: candidates;
	});
	const shownCandidates = $derived(filteredCandidates.slice(0, visibleLimit));
	const selectedCandidates = $derived(
		result?.candidates.filter((candidate) => selected.has(candidate.id)) ?? []
	);
	const backupCounts = $derived.by(() => {
		const entries = backup?.data.items ?? [];
		return {
			links: entries.filter((item) => item.type === 'link').length,
			notes: entries.filter((item) => item.type === 'note').length,
			reminders: entries.filter((item) => item.type === 'reminder').length
		};
	});

	const formatOptions: Array<{ value: ImportFormat | ''; label: string }> = [
		{ value: '', label: 'Detect automatically' },
		{ value: 'text', label: 'Plain text' },
		{ value: 'whatsapp', label: 'WhatsApp export' },
		{ value: 'json', label: 'JSON or Pasted backup' },
		{ value: 'csv', label: 'CSV' },
		{ value: 'markdown', label: 'Markdown' },
		{ value: 'html', label: 'HTML' },
		{ value: 'netscape-bookmarks', label: 'Browser bookmarks' }
	];

	async function parseInWorker(
		input: ImportInput,
		options: ParseImportOptions
	): Promise<ImportResult> {
		if (typeof Worker === 'undefined') return parseImport(input, options);
		const worker = new Worker(new URL('../../../../lib/import/worker.ts', import.meta.url), {
			type: 'module'
		});
		const id = crypto.randomUUID();
		return new Promise((resolveResult, reject) => {
			worker.addEventListener('message', (event) => {
				if (event.data.id !== id) return;
				worker.terminate();
				if (event.data.ok) resolveResult(event.data.result as ImportResult);
				else reject(new Error(event.data.error.message));
			});
			worker.addEventListener('error', (event) => {
				worker.terminate();
				reject(new Error(event.message || 'The import worker stopped unexpectedly.'));
			});
			worker.postMessage({ id, input, options });
		});
	}

	async function handleFilesChange(next: File[]) {
		files = next;
		const file = next[0];
		if (!file) return;
		try {
			filename = file.name;
			mimeType = file.type || 'text/plain';
			if (
				file.name.toLowerCase().endsWith('.zip') ||
				file.type === 'application/zip' ||
				file.type === 'application/x-zip-compressed'
			) {
				backup = parsePastedBackupZip(new Uint8Array(await file.arrayBuffer()));
				content = JSON.stringify(backup);
				formatOverride = 'json';
			} else {
				content = await file.text();
				backup = undefined;
			}
			analysisError = '';
		} catch (error) {
			backup = undefined;
			content = '';
			analysisError =
				error instanceof Error ? error.message : 'The backup file could not be opened.';
		}
	}

	function initializeReview(parsed: ImportResult) {
		selected.clear();
		titles.clear();
		for (const candidate of parsed.candidates) {
			if (candidate.title) titles.set(candidate.id, candidate.title);
			if (candidate.valid && !candidate.duplicate && candidate.secretFindings.length === 0) {
				selected.add(candidate.id);
			}
		}
	}

	async function analyze() {
		analysisError = '';
		if (!content.trim()) {
			analysisError = 'Add a file or paste some text first.';
			return;
		}
		analyzing = true;
		try {
			if (/"format"\s*:\s*"pasted-backup"/i.test(content)) {
				backup = parsePastedBackupJson(content);
			} else backup = undefined;
			const importInput = { content, filename, mimeType };
			const detected = detectImportFormat(importInput, formatOverride || undefined);
			if (detected.format === 'csv') {
				const inspectedColumns = inspectCsvColumns(content, filename, {
					limits: resolveImportLimits()
				});
				const columnsChanged =
					inspectedColumns.length !== csvColumns.length ||
					inspectedColumns.some((column, index) => column.label !== csvColumns[index]?.label);
				if (columnsChanged) {
					selectedCsvColumns.clear();
					for (const column of inspectedColumns) selectedCsvColumns.add(column.index);
				}
				csvColumns = inspectedColumns;
				if (csvColumns.length > 0 && selectedCsvColumns.size === 0) {
					throw new Error('Choose at least one CSV column to scan.');
				}
			} else {
				csvColumns = [];
				selectedCsvColumns.clear();
			}
			const parsed = await parseInWorker(importInput, {
				...(formatOverride ? { format: formatOverride } : {}),
				removeTrackingParameters: removeTracking,
				...(detected.format === 'csv' ? { csvColumns: [...selectedCsvColumns] } : {})
			});
			result = parsed;
			formatOverride = parsed.format;
			initializeReview(parsed);
			step = 2;
		} catch (error) {
			analysisError = error instanceof Error ? error.message : 'The file could not be analyzed.';
		} finally {
			analyzing = false;
		}
	}

	async function applyFormat() {
		await analyze();
	}

	function setCandidate(id: string, value: boolean) {
		if (value) selected.add(id);
		else selected.delete(id);
		const candidate = result?.candidates.find((entry) => entry.id === id);
		if (
			value &&
			candidate?.secretFindings.length &&
			snapshot &&
			!snapshot.results.some((entry) => entry.candidateKey === id)
		) {
			importSessionId = '';
			snapshot = undefined;
			idempotencyKey = '';
		}
	}

	function setTitle(id: string, title: string) {
		if (title) titles.set(id, title);
		else titles.delete(id);
	}

	function toggleCsvColumn(index: number) {
		if (selectedCsvColumns.has(index)) selectedCsvColumns.delete(index);
		else selectedCsvColumns.add(index);
	}

	function selectAllCsvColumns() {
		for (const column of csvColumns) selectedCsvColumns.add(column.index);
	}

	function clearCsvColumns() {
		selectedCsvColumns.clear();
	}

	function selectWhere(predicate: (candidate: ImportCandidate) => boolean) {
		if (!result) return;
		selected.clear();
		for (const candidate of result.candidates) {
			if (candidate.valid && predicate(candidate)) selected.add(candidate.id);
		}
	}

	function invertSelection() {
		if (!result) return;
		for (const candidate of result.candidates) {
			if (!candidate.valid) continue;
			if (selected.has(candidate.id)) selected.delete(candidate.id);
			else selected.add(candidate.id);
		}
	}

	function toggleTag(id: string) {
		if (selectedTags.has(id)) selectedTags.delete(id);
		else selectedTags.add(id);
	}

	async function createCollection(event: SubmitEvent) {
		event.preventDefault();
		collectionError = '';
		const form = new FormData(event.currentTarget as HTMLFormElement);
		const response = await fetch(resolve('/api/v1/collections'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: form.get('name'),
				description: form.get('description') || null,
				color: form.get('color') || null
			})
		});
		const payload = await response.json();
		if (!response.ok || !payload.ok) {
			collectionError = payload.error?.message ?? 'The collection could not be created.';
			return;
		}
		const created = payload.data as LibraryCollection;
		createdCollections = [...createdCollections, { ...created, itemCount: 0 }];
		selectedCollection = created.id;
		collectionDialogOpen = false;
	}

	function serverFormat() {
		if (result?.format === 'json' && /"format"\s*:\s*"pasted-backup"/i.test(content)) {
			return 'pasted-json';
		}
		return result?.format ?? 'text';
	}

	function sourceType() {
		const format = serverFormat();
		if (format === 'pasted-json') return 'pasted';
		if (format === 'netscape-bookmarks') return 'browser-bookmarks';
		return format;
	}

	function buildCandidates() {
		if (!result) return [];
		return result.candidates
			.filter((candidate) => candidate.valid && selected.has(candidate.id))
			.map((candidate) => ({
				id: candidate.id,
				originalUrl: candidate.originalUrl,
				title: titles.get(candidate.id) || null,
				...(candidate.sourceDate ? { sourceDate: candidate.sourceDate } : {}),
				selected: true,
				secretKinds: candidate.secretFindings.map((finding) => finding.kind)
			}));
	}

	async function apiRequest(url: string, method: 'POST' | 'PATCH', body?: unknown) {
		const response = await fetch(url, {
			method,
			...(body === undefined
				? {}
				: { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
			...(abortController ? { signal: abortController.signal } : {})
		});
		const payload = await response.json();
		if (!response.ok || !payload.ok) {
			throw new Error(payload.error?.message ?? 'The import request could not be completed.');
		}
		return payload.data as ImportSnapshot;
	}

	async function ensureSession(): Promise<boolean> {
		if (!result) return false;
		if (importSessionId) return true;
		idempotencyKey = crypto.randomUUID();
		const candidates = buildCandidates();
		if (!candidates.length) throw new Error('No safe selected links are available to import.');
		const created = await apiRequest(resolve('/api/v1/imports'), 'POST', {
			idempotencyKey,
			format: serverFormat(),
			sourceType: sourceType(),
			collectionId: selectedCollection || null,
			tagIds: [...selectedTags],
			ignoredCount: result.summary.ignored,
			candidates
		});
		importSessionId = created.id;
		snapshot = created;

		const serverResults = new Map(created.results.map((entry) => [entry.candidateKey, entry]));
		const discoveredDuplicates = new Set(
			created.results
				.filter((entry) => entry.state === 'duplicate_account')
				.map((entry) => entry.candidateKey)
		);
		result = {
			...result,
			candidates: result.candidates.map((candidate) =>
				discoveredDuplicates.has(candidate.id)
					? { ...candidate, duplicate: { kind: 'existing' as const } }
					: candidate
			),
			summary: {
				...result.summary,
				duplicates: result.candidates.filter(
					(candidate) => candidate.duplicate || discoveredDuplicates.has(candidate.id)
				).length
			}
		};
		for (const [candidateKey, entry] of serverResults) {
			if (entry.selected && !discoveredDuplicates.has(candidateKey)) selected.add(candidateKey);
			else selected.delete(candidateKey);
		}

		if (discoveredDuplicates.size > 0) {
			importMessage = `${discoveredDuplicates.size} links are already in your library. They are now marked so you can choose whether to import copies.`;
			return false;
		}
		return true;
	}

	async function syncReview() {
		if (!importSessionId || !snapshot) return;
		const knownKeys = new Set(snapshot.results.map((entry) => entry.candidateKey));
		const selectedCandidateKeys = [...selected].filter((key) => knownKeys.has(key));
		const candidateTitles = [...titles]
			.filter(([candidateKey]) => knownKeys.has(candidateKey))
			.slice(0, 10_000)
			.map(([candidateKey, title]) => ({ candidateKey, title: title || null }));
		snapshot = await apiRequest(resolve('/api/v1/imports/[id]', { id: importSessionId }), 'PATCH', {
			selectedCandidateKeys,
			candidateTitles,
			collectionId: selectedCollection || null,
			tagIds: [...selectedTags],
			sourceType: sourceType()
		});
	}

	async function runBatches() {
		if (!importSessionId) return;
		const runKey = crypto.randomUUID();
		for (let batch = 0; batch < 200; batch += 1) {
			const next = await apiRequest(
				resolve('/api/v1/imports/[id]/batches', { id: importSessionId }),
				'POST',
				{ idempotencyKey: `${idempotencyKey}:batch:${runKey}:${batch}`, batchSize: 50 }
			);
			snapshot = next;
			importProgress = Math.max(12, next.progress.percent);
			importedCount = next.progress.imported;
			importMessage = `${next.progress.processed} of ${next.progress.total} candidates processed.`;
			if (next.state === 'completed') return;
			if (next.state === 'failed') {
				throw new Error(`${next.progress.failed} links failed. You can retry them safely.`);
			}
		}
		throw new Error('The import stopped after reaching the batch safety limit.');
	}

	async function startImport() {
		if (!result || selectedCandidates.length === 0 || importing) return;
		importing = true;
		importError = '';
		importMessage = 'Checking duplicates against your private library.';
		importProgress = 5;
		abortController = new AbortController();

		try {
			const ready = await ensureSession();
			if (!ready) return;
			step = 4;
			importMessage = 'Saving the selected links in small batches.';
			await syncReview();
			await runBatches();
			importProgress = 100;
			importMessage = `${importedCount} links are now in your library. Metadata will arrive in the background.`;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				importMessage = 'Import cancellation requested.';
			} else {
				importError = error instanceof Error ? error.message : 'The import could not be completed.';
				if (step !== 4) step = 3;
			}
		} finally {
			importing = false;
		}
	}

	async function restoreBackup() {
		if (!backup || importing) return;
		importing = true;
		restoringBackup = true;
		importError = '';
		importProgress = 15;
		importMessage = 'Validating and restoring the complete account backup in one transaction.';
		step = 4;
		if (!idempotencyKey) idempotencyKey = crypto.randomUUID();

		try {
			const response = await fetch(resolve('/api/v1/imports/restore'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ idempotencyKey, backup })
			});
			const payload = await response.json();
			if (!response.ok || !payload.ok) {
				throw new Error(payload.error?.message ?? 'The full backup could not be restored.');
			}
			const restored = payload.data as {
				sessionId: string;
				collectionsCreated: number;
				tagsCreated: number;
				linksCreated: number;
				notesCreated: number;
				remindersCreated: number;
				itemsCreated: number;
				replayed: boolean;
			};
			importSessionId = restored.sessionId;
			importedCount = restored.itemsCreated;
			importProgress = 100;
			importMessage = `${restored.itemsCreated} items restored: ${restored.linksCreated} links, ${restored.notesCreated} notes, and ${restored.remindersCreated} reminders. ${restored.collectionsCreated} collections and ${restored.tagsCreated} tags were added.`;
		} catch (error) {
			importProgress = 15;
			importError =
				error instanceof Error ? error.message : 'The full backup could not be restored.';
		} finally {
			importing = false;
		}
	}

	async function retryFailed() {
		if (!importSessionId || importing) return;
		importing = true;
		importError = '';
		abortController = new AbortController();
		try {
			snapshot = await apiRequest(
				resolve('/api/v1/imports/[id]/retry', { id: importSessionId }),
				'POST',
				{ idempotencyKey: `${idempotencyKey}:retry:${crypto.randomUUID()}` }
			);
			await runBatches();
			importProgress = 100;
			importMessage = `${importedCount} links are now in your library.`;
		} catch (error) {
			importError = error instanceof Error ? error.message : 'The retry could not be completed.';
		} finally {
			importing = false;
		}
	}

	async function cancelImport() {
		abortController?.abort();
		if (!importSessionId) return;
		abortController = undefined;
		try {
			snapshot = await apiRequest(
				resolve('/api/v1/imports/[id]/cancel', { id: importSessionId }),
				'POST'
			);
			importMessage = 'Import cancelled. Completed links remain saved.';
		} catch (error) {
			importError = error instanceof Error ? error.message : 'Cancellation could not be confirmed.';
		}
	}

	function restart() {
		step = 1;
		result = undefined;
		backup = undefined;
		restoringBackup = false;
		content = '';
		files = [];
		selected.clear();
		selectedCsvColumns.clear();
		csvColumns = [];
		titles.clear();
		importError = '';
		importMessage = '';
		importProgress = 0;
		importedCount = 0;
		importSessionId = '';
		snapshot = undefined;
		idempotencyKey = '';
		selectedTags.clear();
		selectedCollection = '';
	}
</script>

<svelte:head>
	<title>Import | Pasted</title>
	<meta
		name="description"
		content="Extract useful links or restore a complete Pasted JSON or ZIP account backup."
	/>
</svelte:head>

<main class="import-page">
	<header class="import-head">
		<a href={resolve('/app')}><span aria-hidden="true">←</span> Library</a>
		<p>Private by default</p>
		<h1>Leave the clutter. Keep the links.</h1>
		<p>Your file is analyzed in this browser. Pasted never stores the original chat or file.</p>
	</header>

	<ol class="stepper" aria-label="Import progress">
		{#each [{ number: 1, label: 'Add content' }, { number: 2, label: 'Check format' }, { number: 3, label: 'Choose links' }, { number: 4, label: 'Import' }] as item (item.number)}
			<li class:active={step === item.number} class:complete={step > item.number}>
				<span>{step > item.number ? '✓' : item.number}</span>{item.label}
			</li>
		{/each}
	</ol>

	{#if step === 1}
		<section class="source-stage" aria-labelledby="source-title">
			<div class="stage-copy">
				<p class="eyebrow">Step one</p>
				<h2 id="source-title">Drop it here.</h2>
				<p>
					TXT, JSON, CSV, Markdown, HTML, browser bookmarks, WhatsApp exports, and Pasted backups
					are welcome.
				</p>
				<ul>
					<li>The original file stays in your browser.</li>
					<li>WhatsApp names and ordinary messages are not kept.</li>
					<li>Possible tokens and credentials are masked.</li>
				</ul>
			</div>
			<div class="source-inputs">
				<FileDropzone
					bind:files
					accept=".txt,.json,.zip,.csv,.tsv,.md,.markdown,.html,.htm,text/plain,application/json,application/zip,application/x-zip-compressed,text/csv,text/html"
					maxSize={50 * 1024 * 1024}
					label="Drop a file, chat, or backup"
					description="Imports up to 10 MB, or Pasted backups up to 50 MB. Read locally."
					onFilesChange={handleFilesChange}
				/>
				<div class="or"><span>or paste text</span></div>
				<Textarea
					label="Text, JSON, or CSV"
					bind:value={content}
					rows={10}
					placeholder="Paste messy text here. The ordinary words will be left behind."
				/>
				<div class="source-options">
					<label
						>Format
						<select bind:value={formatOverride}>
							{#each formatOptions as option (option.value)}<option value={option.value}
									>{option.label}</option
								>{/each}
						</select>
					</label>
					<label class="tracking"
						><input type="checkbox" bind:checked={removeTracking} /> Remove known tracking parameters</label
					>
				</div>
				{#if analysisError}<p class="error" role="alert">{analysisError}</p>{/if}
				<Button onclick={analyze} loading={analyzing} loadingLabel="Analyzing locally" fullWidth
					>Find the useful parts</Button
				>
			</div>
		</section>
	{:else if step === 2 && result}
		<section class="detected-stage" aria-labelledby="detected-title">
			<p class="eyebrow">Step two</p>
			{#if backup}
				<h2 id="detected-title">A complete Pasted backup.</h2>
				<p>
					Version {backup.version}, exported {new Date(backup.exportedAt).toLocaleDateString()}. The
					restore is atomic and keeps links, notes, reminders, organization, dates, and states.
				</p>
				<div class="detected-summary backup-summary">
					<div><strong>{backup.manifest.itemCount}</strong><span>items</span></div>
					<div><strong>{backupCounts.links}</strong><span>links</span></div>
					<div><strong>{backupCounts.notes}</strong><span>notes</span></div>
					<div><strong>{backupCounts.reminders}</strong><span>reminders</span></div>
					<div><strong>{backup.manifest.collectionCount}</strong><span>collections</span></div>
					<div><strong>{backup.manifest.tagCount}</strong><span>tags</span></div>
				</div>
				<p class="restore-note">
					Existing collections and tags with the same names are reused. Backup items are restored as
					new private items, and retrying this exact operation cannot create a second copy.
				</p>
				<div class="backup-actions">
					<Button variant="outline" onclick={restart}>Choose another file</Button>
					<Button onclick={restoreBackup}>Restore full backup</Button>
				</div>
			{:else}
				<h2 id="detected-title">
					This looks like {formatOptions.find((entry) => entry.value === result?.format)?.label ??
						result.format}.
				</h2>
				<p>
					{result.detection.reasons.join('. ')}. Detection confidence: {Math.round(
						result.detection.confidence * 100
					)}%.
				</p>
				<div class="detected-summary">
					<div><strong>{result.summary.found}</strong><span>links found</span></div>
					<div><strong>{result.summary.valid}</strong><span>valid</span></div>
					<div><strong>{result.summary.duplicates}</strong><span>duplicates</span></div>
					<div><strong>{result.summary.ignored}</strong><span>ignored lines</span></div>
					<div><strong>{result.summary.withSecrets}</strong><span>need review</span></div>
				</div>
				{#if result.warnings.length}
					<ul class="warnings">
						{#each result.warnings as warning (warning.code)}<li>{warning.message}</li>{/each}
					</ul>
				{/if}
				{#if result.format === 'csv' && csvColumns.length}
					<fieldset class="csv-columns">
						<div class="csv-columns-head">
							<div>
								<legend>CSV columns to scan</legend>
								<p>Choose the columns that may contain links, then analyze again.</p>
							</div>
							<div>
								<button type="button" onclick={selectAllCsvColumns}>Select all</button>
								<button type="button" onclick={clearCsvColumns}>Clear</button>
							</div>
						</div>
						<div class="csv-column-options">
							{#each csvColumns as column (column.index)}
								<label>
									<input
										type="checkbox"
										checked={selectedCsvColumns.has(column.index)}
										onchange={() => toggleCsvColumn(column.index)}
									/>
									<span>{column.label}</span>
								</label>
							{/each}
						</div>
					</fieldset>
				{/if}
				<div class="detected-actions">
					<label
						>Detected format
						<select bind:value={formatOverride}>
							{#each formatOptions.filter((entry) => entry.value) as option (option.value)}<option
									value={option.value}>{option.label}</option
								>{/each}
						</select>
					</label>
					<Button variant="outline" onclick={applyFormat} loading={analyzing}>Analyze again</Button>
					<Button onclick={() => (step = 3)}>Review {result.summary.valid} links</Button>
				</div>
			{/if}
		</section>
	{:else if step === 3 && result}
		<section class="review-stage" aria-labelledby="review-title">
			<header class="review-head">
				<div>
					<p class="eyebrow">Step three</p>
					<h2 id="review-title">Choose what stays.</h2>
				</div>
				<div class="selection-total">
					<strong>{selected.size}</strong><span>selected of {result.summary.found}</span>
				</div>
			</header>

			<div class="review-toolbar">
				<label class="review-search"
					><AppIcon name="search" size={18} /><span class="sr-only">Search detected links</span
					><input bind:value={search} placeholder="Search results" /></label
				>
				<select bind:value={domain} aria-label="Filter by domain"
					><option value="">Every domain</option>{#each domains as entry (entry)}<option
							value={entry}>{entry}</option
						>{/each}</select
				>
				<label class="group-toggle"
					><input type="checkbox" bind:checked={groupByDomain} /> Group by domain</label
				>
			</div>

			<div class="selection-tools" aria-label="Selection controls">
				<button type="button" onclick={() => selectWhere(() => true)}>Select all links</button>
				<button type="button" onclick={() => selectWhere((candidate) => !candidate.duplicate)}
					>Only new</button
				>
				<button
					type="button"
					onclick={() => selectWhere((candidate) => Boolean(candidate.duplicate))}
					>Only duplicates</button
				>
				<button type="button" onclick={() => selected.clear()}>Deselect all</button>
				<button type="button" onclick={invertSelection}>Invert selection</button>
			</div>
			{#if importMessage && importSessionId}
				<p class="review-notice" role="status">{importMessage}</p>
			{/if}

			<div class="review-layout">
				<div class="results-list" role="list" aria-label="Detected links" aria-live="polite">
					{#each shownCandidates as candidate (candidate.id)}
						<ImportResultRow
							{candidate}
							selected={selected.has(candidate.id)}
							title={titles.get(candidate.id) ?? ''}
							onSelect={setCandidate}
							onTitleChange={setTitle}
						/>
					{/each}
					{#if shownCandidates.length === 0}<p class="no-results">
							No detected links match these filters.
						</p>{/if}
					{#if visibleLimit < filteredCandidates.length}<button
							class="show-more"
							type="button"
							onclick={() => (visibleLimit += 200)}>Show 200 more</button
						>{/if}
				</div>

				<aside class="import-options">
					<p class="eyebrow">Put them somewhere</p>
					<label
						>Collection
						<select bind:value={selectedCollection}
							><option value="">Unorganized</option
							>{#each collections as collection (collection.id)}<option value={collection.id}
									>{collection.name}</option
								>{/each}</select
						>
					</label>
					<button class="new-collection" type="button" onclick={() => (collectionDialogOpen = true)}
						>+ Create a collection</button
					>
					{#if tags.length}
						<fieldset>
							<legend>Tags</legend>
							<div class="tag-options">
								{#each tags as tag (tag.id)}<button
										type="button"
										class:active={selectedTags.has(tag.id)}
										onclick={() => toggleTag(tag.id)}
										><span style:background={tag.color ?? '#e7dfd3'}></span>{tag.name}</button
									>{/each}
							</div>
						</fieldset>
					{/if}
					<div class="privacy-note">
						<AppIcon name="check" />
						<p><strong>Selected links only.</strong> The rest of the file is discarded.</p>
					</div>
					<Button fullWidth disabled={selected.size === 0} onclick={startImport}
						>Import {selected.size} links</Button
					>
				</aside>
			</div>
		</section>
	{:else if step === 4}
		<section class="progress-stage" aria-labelledby="progress-title">
			<div class:complete={importProgress === 100} class="progress-mark">
				<AppIcon name={importProgress === 100 ? 'check' : 'import'} size={34} />
			</div>
			<p class="eyebrow">Step four</p>
			<h2 id="progress-title">
				{importProgress === 100
					? 'Back where they belong.'
					: importError
						? 'A few things need attention.'
						: restoringBackup
							? 'Restoring your backup.'
							: 'Saving your selection.'}
			</h2>
			<Progress value={importProgress} label="Import progress" showValue />
			<p class="progress-message" aria-live="polite">{importError || importMessage}</p>
			<div class="progress-actions">
				{#if importing && restoringBackup}<p class="restore-wait" role="status">
						The atomic restore is running. Keep this page open.
					</p>
				{:else if importing}<Button variant="outline" onclick={cancelImport}>Cancel safely</Button>
				{:else if importError && restoringBackup}<Button variant="outline" onclick={restart}
						>Start over</Button
					><Button onclick={restoreBackup}>Retry full restore</Button>
				{:else if importError}<Button variant="outline" onclick={() => (step = 3)}
						>Back to review</Button
					><Button onclick={retryFailed}>Retry failed links</Button>
				{:else if importProgress === 100}<a
						class="button-link"
						href={restoringBackup
							? resolve('/app')
							: `${resolve('/app')}?sourceImport=${importSessionId}`}
						>{restoringBackup ? 'View restored library' : 'View imported links'}</a
					><Button variant="outline" onclick={restart}>Import another file</Button>{/if}
			</div>
		</section>
	{/if}
</main>

<Dialog
	bind:open={collectionDialogOpen}
	title="Create a collection"
	description="The import stays open behind this dialog."
>
	<form class="collection-form" onsubmit={createCollection}>
		<Input label="Name" name="name" required maxlength={100} />
		<Input label="Description" name="description" />
		<Input label="Color" name="color" type="color" value="#d8ff78" />
		{#if collectionError}<p class="error" role="alert">{collectionError}</p>{/if}
		<Button type="submit" fullWidth>Create and select</Button>
	</form>
</Dialog>

<style>
	.import-page {
		max-width: 92rem;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 5rem) var(--page-gutter) 7rem;
	}
	.import-head {
		display: grid;
		max-width: 64rem;
		gap: 0.8rem;
		margin-bottom: var(--space-7-5);
	}
	.import-head > a {
		width: fit-content;
		color: inherit;
		font-size: var(--text-body-small);
		text-decoration: none;
	}
	.import-head > p:first-of-type,
	.eyebrow {
		margin: 0;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}
	.import-head h1,
	h2,
	.import-head p {
		margin: 0;
	}
	.import-head h1 {
		max-width: 12ch;
		font-family: var(--font-display);
		font-size: clamp(3.8rem, 10vw, 9rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.055em;
		line-height: 0.82;
	}
	.import-head > p:last-child {
		max-width: 48ch;
		color: var(--text-muted);
	}
	.stepper {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		margin: 0 0 clamp(3rem, 7vw, 6rem);
		padding: 0;
		border-top: var(--border-hairline) solid var(--border-default);
		list-style: none;
	}
	.stepper li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border-top: 3px solid transparent;
		padding: 0.8rem 0.25rem;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}
	.stepper li.active {
		border-color: var(--color-press-black);
		color: var(--text-primary);
	}
	.stepper li.complete {
		border-color: var(--surface-accent);
	}
	.stepper span {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		place-items: center;
		border: var(--border-hairline) solid currentColor;
		border-radius: 50%;
		font-size: 0.7rem;
	}
	.source-stage {
		display: grid;
		grid-template-columns: minmax(16rem, 0.7fr) minmax(20rem, 1fr);
		gap: clamp(3rem, 8vw, 9rem);
	}
	.stage-copy,
	.source-inputs,
	.collection-form {
		display: grid;
		align-content: start;
		gap: var(--space-5);
	}
	h2 {
		max-width: 12ch;
		font-family: var(--font-display);
		font-size: clamp(3rem, 7vw, 6.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.05em;
		line-height: 0.86;
	}
	.stage-copy > p:last-of-type,
	.detected-stage > p,
	.progress-message {
		max-width: 52ch;
		color: var(--text-muted);
	}
	.stage-copy ul {
		display: grid;
		gap: 0.75rem;
		padding-left: 1.25rem;
		color: var(--text-muted);
	}
	.or {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		color: var(--text-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
	}
	.or::before,
	.or::after {
		height: 1px;
		flex: 1;
		background: var(--border-subtle);
		content: '';
	}
	.source-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3-75);
	}
	.source-options > label,
	.detected-actions label,
	.import-options > label {
		display: grid;
		gap: 0.5rem;
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
		padding: 0 0.8rem;
	}
	.source-options .tracking {
		display: flex;
		min-height: 3rem;
		align-items: center;
		gap: 0.6rem;
		padding-top: 1.25rem;
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-regular);
		letter-spacing: 0;
		text-transform: none;
	}
	.error {
		margin: 0;
		border-left: 3px solid var(--color-press-black);
		padding-left: 0.75rem;
		font-size: var(--text-body-small);
	}
	.detected-stage {
		display: grid;
		max-width: 70rem;
		gap: var(--space-5);
		margin: 0 auto;
		text-align: center;
	}
	.detected-stage h2 {
		max-width: none;
	}
	.detected-stage > p {
		margin: 0 auto;
	}
	.detected-summary {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		margin: var(--space-5) 0;
		border-block: var(--border-hairline) solid var(--border-default);
	}
	.detected-summary div {
		display: grid;
		gap: 0.35rem;
		border-right: var(--border-hairline) solid var(--border-subtle);
		padding: 1.5rem 0.75rem;
	}
	.detected-summary div:last-child {
		border: 0;
	}
	.detected-summary strong {
		font-family: var(--font-display);
		font-size: 2.8rem;
		font-weight: var(--font-weight-regular);
	}
	.detected-summary span {
		color: var(--text-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
	}
	.warnings {
		margin: 0;
		padding: 1rem 2rem;
		background: var(--surface-subtle);
		text-align: left;
	}
	.csv-columns {
		display: grid;
		gap: 1rem;
		margin: 0;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-card);
		padding: 1rem;
		text-align: left;
	}
	.csv-columns legend {
		font-weight: var(--font-weight-medium);
	}
	.csv-columns p {
		margin: 0.25rem 0 0;
		color: var(--text-muted);
		font-size: var(--text-caption);
	}
	.csv-columns-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}
	.csv-columns-head > div:last-child {
		display: flex;
		gap: 0.75rem;
	}
	.csv-columns-head button {
		border: 0;
		background: transparent;
		color: var(--text-accent);
		font: inherit;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}
	.csv-column-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.625rem;
	}
	.csv-column-options label {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		border-radius: var(--radius-control);
		background: var(--surface-subtle);
		padding: 0.75rem;
		font-size: var(--text-body-small);
		cursor: pointer;
	}
	.csv-column-options span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.detected-actions {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: end;
		gap: var(--space-3-75);
	}
	.backup-summary {
		grid-template-columns: repeat(6, 1fr);
	}
	.restore-note {
		border-left: 3px solid var(--surface-accent);
		background: var(--surface-subtle);
		padding: 1rem;
		text-align: left;
	}
	.backup-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3-75);
	}
	.restore-wait {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}
	.review-stage {
		display: grid;
		gap: var(--space-5);
	}
	.review-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
	}
	.review-head h2 {
		max-width: none;
	}
	.selection-total {
		display: grid;
		flex: 0 0 auto;
		text-align: right;
	}
	.selection-total strong {
		font-family: var(--font-display);
		font-size: 3.5rem;
		font-weight: var(--font-weight-regular);
		line-height: 0.9;
	}
	.selection-total span {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}
	.review-toolbar {
		display: grid;
		grid-template-columns: minmax(14rem, 1fr) auto auto;
		gap: 0.6rem;
		padding-block: var(--space-3-75);
		border-block: var(--border-hairline) solid var(--border-default);
	}
	.review-search {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 0 0.8rem;
	}
	.review-search input {
		width: 100%;
		min-height: 3rem;
		border: 0;
		outline: 0;
		background: transparent;
		color: inherit;
		font: inherit;
	}
	.group-toggle {
		display: flex;
		min-height: 3rem;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-body-small);
	}
	.selection-tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.selection-tools button,
	.new-collection,
	.show-more {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		padding: 0.65rem 0.8rem;
		font-size: var(--text-body-small);
	}
	.selection-tools button:hover,
	.new-collection:hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}
	.review-notice {
		margin: 0;
		border-left: 3px solid var(--surface-accent);
		background: var(--surface-subtle);
		padding: 0.8rem 1rem;
		font-size: var(--text-body-small);
	}
	.review-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
		align-items: start;
		gap: clamp(2rem, 5vw, 5rem);
	}
	.results-list {
		min-width: 0;
		border-top: var(--border-hairline) solid var(--border-default);
	}
	.no-results {
		padding: 4rem 1rem;
		color: var(--text-muted);
		text-align: center;
	}
	.show-more {
		display: block;
		margin: 1.5rem auto;
	}
	.import-options {
		position: sticky;
		top: 1rem;
		display: grid;
		gap: var(--space-5);
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		padding: 1.5rem;
	}
	.new-collection {
		margin-top: -0.8rem;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 0.7rem;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}
	.tag-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.tag-options button {
		display: flex;
		min-height: 2.5rem;
		align-items: center;
		gap: 0.4rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-full);
		background: transparent;
		color: inherit;
		padding: 0.45rem 0.65rem;
	}
	.tag-options button.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}
	.tag-options button span {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}
	.privacy-note {
		display: flex;
		gap: 0.7rem;
		border-radius: var(--radius-control);
		background: var(--surface-subtle);
		padding: 0.8rem;
	}
	.privacy-note p {
		margin: 0;
		font-size: var(--text-body-small);
	}
	.progress-stage {
		display: grid;
		width: min(100%, 42rem);
		place-items: center;
		gap: var(--space-5);
		margin: 0 auto;
		text-align: center;
	}
	.progress-stage h2 {
		max-width: none;
	}
	.progress-mark {
		display: grid;
		width: 5rem;
		height: 5rem;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: 50%;
		animation: import-pulse 1.5s ease-in-out infinite;
	}
	.progress-mark.complete {
		background: var(--surface-accent);
		animation: none;
	}
	.progress-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.7rem;
	}
	.button-link {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		border-radius: var(--radius-button);
		background: var(--surface-accent);
		box-shadow: var(--shadow-green);
		color: var(--color-typesetter-ink);
		padding: 1rem 1.5rem;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-decoration: none;
		text-transform: uppercase;
	}
	@keyframes import-pulse {
		50% {
			background: var(--surface-accent);
			transform: scale(0.96);
		}
	}
	@media (max-width: 58rem) {
		.source-stage,
		.review-layout {
			grid-template-columns: 1fr;
		}
		.import-options {
			position: static;
		}
		.detected-summary {
			grid-template-columns: repeat(3, 1fr);
		}
		.detected-actions,
		.review-toolbar {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 40rem) {
		.stepper {
			grid-template-columns: repeat(4, minmax(4.5rem, 1fr));
			overflow-x: auto;
		}
		.stepper li {
			align-items: flex-start;
			flex-direction: column;
		}
		.source-options,
		.detected-summary {
			grid-template-columns: 1fr;
		}
		.detected-summary div {
			border-right: 0;
			border-bottom: var(--border-hairline) solid var(--border-subtle);
		}
		.review-head {
			align-items: flex-start;
			flex-direction: column;
		}
		.selection-total {
			text-align: left;
		}
	}
</style>
