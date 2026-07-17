<script lang="ts">
	import AppIcon from './AppIcon.svelte';
	import type { ImportCandidate } from '$lib/import';

	let {
		candidate,
		selected = false,
		title = '',
		onSelect,
		onTitleChange
	}: {
		candidate: ImportCandidate;
		selected?: boolean;
		title?: string;
		onSelect: (id: string, selected: boolean) => void;
		onTitleChange: (id: string, title: string) => void;
	} = $props();

	const blocked = $derived(!candidate.valid);
	const status = $derived(
		blocked
			? 'Invalid'
			: candidate.duplicate?.kind === 'existing'
				? 'Already saved'
				: candidate.duplicate
					? 'Repeated in file'
					: candidate.secretFindings.length
						? 'Review secret'
						: 'New'
	);
</script>

<article class:selected class:blocked class="result-row">
	<label class="row-check">
		<input
			type="checkbox"
			checked={selected}
			disabled={blocked}
			aria-label={`Select ${candidate.displayUrl}`}
			onchange={(event) => onSelect(candidate.id, event.currentTarget.checked)}
		/>
		<span aria-hidden="true"><AppIcon name="check" size={15} /></span>
	</label>

	<div class="result-main">
		<header>
			<span class:warning={candidate.secretFindings.length > 0} class="status">{status}</span>
			{#if candidate.domain}<strong>{candidate.domain}</strong>{/if}
			{#if candidate.sourceDate}<time datetime={candidate.sourceDate}
					>{candidate.sourceDate.slice(0, 10)}</time
				>{/if}
		</header>
		<input
			class="title-input"
			value={title}
			placeholder="Optional title"
			aria-label={`Title for ${candidate.displayUrl}`}
			maxlength="300"
			oninput={(event) => onTitleChange(candidate.id, event.currentTarget.value)}
		/>
		<p class="display-url">{candidate.displayUrl}</p>
		{#if candidate.sourceExcerpt}
			<blockquote>{candidate.sourceExcerpt}</blockquote>
		{/if}
		{#if candidate.secretFindings.length}
			<div class="findings" role="alert">
				<AppIcon name="bell" size={16} />
				<span
					>Possible {candidate.secretFindings.map((finding) => finding.label).join(', ')}. The value
					stays masked.</span
				>
			</div>
		{/if}
		{#if candidate.issues.length}
			<ul>
				{#each candidate.issues as issue (issue.code)}<li>{issue.message}</li>{/each}
			</ul>
		{/if}
	</div>
</article>

<style>
	.result-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem;
		background: var(--surface-canvas);
		transition: background-color var(--motion-fast) var(--ease-out);
	}

	.result-row.selected {
		background: color-mix(in srgb, var(--surface-accent) 9%, var(--surface-canvas));
	}

	.result-row.blocked {
		opacity: 0.68;
	}

	.row-check {
		position: relative;
		display: grid;
		width: 1.4rem;
		height: 1.4rem;
		place-items: center;
		margin-top: 0.2rem;
	}

	.row-check input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		appearance: none;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: 0.25rem;
		background: var(--surface-canvas);
	}

	.row-check input:checked {
		background: var(--color-press-black);
	}

	.row-check span {
		z-index: 1;
		color: var(--text-inverse);
		opacity: 0;
		pointer-events: none;
	}

	.row-check input:checked + span {
		opacity: 1;
	}

	.result-main {
		display: grid;
		min-width: 0;
		gap: 0.55rem;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.8rem;
		font-size: 0.7rem;
	}

	.status {
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		padding: 0.3rem 0.55rem;
		font-weight: var(--font-weight-medium);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.status.warning {
		background: var(--color-newsprint-gray);
	}

	header strong,
	header time {
		color: var(--text-muted);
		font-weight: var(--font-weight-regular);
	}

	.title-input {
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		color: inherit;
		font-family: var(--font-display);
		font-size: 1.5rem;
		letter-spacing: -0.025em;
	}

	.title-input:focus {
		box-shadow: 0 2px 0 var(--focus-ring);
	}

	.display-url,
	blockquote,
	.findings,
	ul {
		margin: 0;
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.display-url {
		overflow: hidden;
		color: var(--text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	blockquote {
		border-left: 2px solid var(--border-default);
		color: var(--text-muted);
		padding-left: 0.75rem;
	}

	.findings {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		border-radius: var(--radius-control);
		background: var(--surface-subtle);
		padding: 0.7rem;
	}

	ul {
		padding-left: 1.1rem;
	}

	@media (max-width: 40rem) {
		.result-row {
			padding-inline: 0;
		}
	}
</style>
