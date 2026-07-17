<script lang="ts">
	type Rejection = {
		file: File;
		reason: 'type' | 'size' | 'count';
	};

	type Props = {
		files?: File[];
		label?: string;
		description?: string;
		accept?: string;
		multiple?: boolean;
		maxFiles?: number;
		maxSize?: number;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		error?: string;
		onFilesChange?: (files: File[]) => void;
		onReject?: (rejections: Rejection[]) => void;
		class?: string;
	};

	const uid = $props.id();
	let {
		files = $bindable<File[]>([]),
		label = 'Choose files or drop them here',
		description = 'Drag files here, or use the button to browse.',
		accept,
		multiple = false,
		maxFiles = Number.POSITIVE_INFINITY,
		maxSize = Number.POSITIVE_INFINITY,
		disabled = false,
		required = false,
		name,
		error,
		onFilesChange,
		onReject,
		class: className = ''
	}: Props = $props();

	let input: HTMLInputElement;
	let dragging = $state(false);
	let internalError = $state('');
	const visibleError = $derived(error || internalError);
	const describedBy = $derived(
		[description ? `${uid}-description` : '', visibleError ? `${uid}-error` : '']
			.filter(Boolean)
			.join(' ') || undefined
	);

	function matchesAccept(file: File) {
		if (!accept) return true;
		return accept
			.split(',')
			.map((part) => part.trim().toLowerCase())
			.some((rule) => {
				if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
				if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
				return file.type.toLowerCase() === rule;
			});
	}

	function publish(next: File[]) {
		files = next;
		onFilesChange?.(next);
	}

	function processFiles(incoming: File[]) {
		const rejections: Rejection[] = [];
		const valid = incoming.filter((file) => {
			if (!matchesAccept(file)) {
				rejections.push({ file, reason: 'type' });
				return false;
			}
			if (file.size > maxSize) {
				rejections.push({ file, reason: 'size' });
				return false;
			}
			return true;
		});

		const merged = multiple ? [...files, ...valid] : valid.slice(0, 1);
		const unique = merged.filter(
			(file, index, all) =>
				all.findIndex(
					(candidate) =>
						candidate.name === file.name &&
						candidate.size === file.size &&
						candidate.lastModified === file.lastModified
				) === index
		);
		const accepted = unique.slice(0, multiple ? maxFiles : 1);
		unique.slice(accepted.length).forEach((file) => rejections.push({ file, reason: 'count' }));

		publish(accepted);
		internalError = rejections.length
			? 'Some files could not be added. Check type, size, and file count.'
			: '';
		if (rejections.length) onReject?.(rejections);
		if (input) input.value = '';
	}

	function handleInput(event: Event) {
		processFiles(Array.from((event.currentTarget as HTMLInputElement).files ?? []));
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (!disabled) processFiles(Array.from(event.dataTransfer?.files ?? []));
	}

	function removeFile(index: number) {
		if (!disabled) publish(files.filter((_, fileIndex) => fileIndex !== index));
	}

	function formatBytes(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class={`dropzone-field ${className}`} data-invalid={visibleError ? 'true' : undefined}>
	<input
		bind:this={input}
		id={uid}
		class="sr-only"
		tabindex="-1"
		type="file"
		{name}
		{accept}
		{multiple}
		{disabled}
		{required}
		aria-describedby={describedBy}
		aria-invalid={visibleError ? 'true' : undefined}
		onchange={handleInput}
	/>
	<button
		type="button"
		class="dropzone"
		class:dropzone--dragging={dragging}
		{disabled}
		aria-describedby={describedBy}
		onclick={() => input?.click()}
		ondragenter={(event) => {
			event.preventDefault();
			if (!disabled) dragging = true;
		}}
		ondragover={(event) => event.preventDefault()}
		ondragleave={(event) => {
			if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dragging = false;
		}}
		ondrop={handleDrop}
	>
		<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
			<path
				d="M16 22V6m0 0-6 6m6-6 6 6M7 20v5h18v-5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			/>
		</svg>
		<strong>{label}</strong>
		<span id={`${uid}-description`}>{description}</span>
	</button>
	{#if visibleError}
		<p class="dropzone-field__error" id={`${uid}-error`} aria-live="polite">{visibleError}</p>
	{/if}
	{#if files.length}
		<ul aria-label="Selected files">
			{#each files as file, index (`${file.name}-${file.size}-${file.lastModified}`)}
				<li>
					<span class="file-copy">
						<strong>{file.name}</strong>
						<small>{formatBytes(file.size)}</small>
					</span>
					<button
						type="button"
						{disabled}
						aria-label={`Remove ${file.name}`}
						onclick={() => removeFile(index)}
					>
						<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
							<path d="m4 4 12 12M16 4 4 16" fill="none" stroke="currentColor" stroke-width="1.5" />
						</svg>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.dropzone-field {
		display: grid;
		gap: 0.75rem;
	}

	.dropzone {
		display: grid;
		min-height: 10rem;
		place-items: center;
		align-content: center;
		gap: 0.5rem;
		border: 1px dashed var(--border-default);
		border-radius: var(--radius-image);
		background: transparent;
		color: var(--text-primary);
		padding: 1.5rem;
		text-align: center;
		transition:
			background-color var(--motion-fast) var(--ease-out),
			border-color var(--motion-fast) var(--ease-out),
			transform var(--motion-fast) var(--ease-out);
	}

	.dropzone:hover,
	.dropzone--dragging {
		border-style: solid;
		background: color-mix(in srgb, var(--surface-accent) 12%, var(--surface-canvas));
	}

	.dropzone--dragging {
		transform: scale(0.995);
	}

	.dropzone:disabled {
		opacity: 0.55;
	}

	.dropzone-field[data-invalid='true'] .dropzone {
		border-width: 2px;
		border-color: var(--color-press-black);
	}

	.dropzone strong {
		font-size: var(--text-body-compact);
		font-weight: var(--font-weight-medium);
	}

	.dropzone span,
	.dropzone-field__error,
	small {
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.dropzone span,
	small {
		color: var(--text-muted);
	}

	.dropzone-field__error {
		margin: 0;
		font-weight: var(--font-weight-medium);
	}

	ul {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		min-height: 3rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 0.5rem 0;
	}

	.file-copy {
		display: grid;
		min-width: 0;
		gap: 0.125rem;
	}

	.file-copy strong {
		overflow: hidden;
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	li button {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
	}

	li button:hover {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}
</style>
