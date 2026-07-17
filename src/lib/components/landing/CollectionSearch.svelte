<script lang="ts">
	type Item = {
		title: string;
		domain: string;
		collection: string;
		note: string;
	};

	const items: Item[] = [
		{
			title: 'A practical guide to local-first tools',
			domain: 'workbench.example',
			collection: 'Project Atlas',
			note: 'Useful for the offline architecture discussion.'
		},
		{
			title: 'Research notes for the tiny web',
			domain: 'smallweb.example',
			collection: 'Research',
			note: 'A good map of independent publishing tools.'
		},
		{
			title: 'A calmer way to review a busy week',
			domain: 'fieldnotes.example',
			collection: 'Reading list',
			note: 'Try this during the Friday review.'
		}
	];

	const collections = ['All', 'Project Atlas', 'Research', 'Reading list'];
	let query = $state('local');
	let activeCollection = $state('All');
	const results = $derived(
		items.filter((item) => {
			const matchesCollection = activeCollection === 'All' || item.collection === activeCollection;
			const haystack = `${item.title} ${item.domain} ${item.collection} ${item.note}`.toLowerCase();
			return matchesCollection && haystack.includes(query.trim().toLowerCase());
		})
	);
</script>

<div class="search-demo">
	<div class="search-demo__field">
		<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
			<circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
			<path d="m13.5 13.5 4 4" stroke="currentColor" />
		</svg>
		<label class="sr-only" for="landing-search">Search saved links</label>
		<input
			id="landing-search"
			bind:value={query}
			placeholder="Search links, notes, tags, or domains"
		/>
		<button type="button" aria-label="Clear search" onclick={() => (query = '')}>Clear</button>
	</div>
	<div class="search-demo__collections" aria-label="Filter by collection">
		{#each collections as collection (collection)}
			<button
				type="button"
				class:active={activeCollection === collection}
				aria-pressed={activeCollection === collection}
				onclick={() => (activeCollection = collection)}>{collection}</button
			>
		{/each}
	</div>
	<div class="search-demo__meta" aria-live="polite">
		<span>{results.length} {results.length === 1 ? 'result' : 'results'}</span>
		<span>Everything searched locally</span>
	</div>
	<div class="search-demo__results">
		{#each results as item (item.title)}
			<article>
				<div class="search-demo__glyph" aria-hidden="true">{item.title.charAt(0)}</div>
				<div>
					<p>{item.collection}</p>
					<h3>{item.title}</h3>
					<small>{item.domain}</small>
					<blockquote>{item.note}</blockquote>
				</div>
				<span>↗</span>
			</article>
		{:else}
			<div class="search-demo__empty">
				<strong>No matching links.</strong>
				<p>Try a title, domain, note, or another collection.</p>
			</div>
		{/each}
	</div>
</div>

<style>
	.search-demo {
		display: grid;
		gap: 1rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-canvas);
		padding: clamp(1rem, 3vw, 1.5rem);
	}

	.search-demo__field {
		display: grid;
		min-height: 3.5rem;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 0 0.875rem;
	}

	.search-demo__field:focus-within {
		box-shadow: 0 0 0 3px var(--focus-ring);
	}

	.search-demo__field input {
		min-width: 0;
		min-height: 3.25rem;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--text-primary);
	}

	.search-demo__field button,
	.search-demo__collections button {
		min-height: 2.75rem;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.search-demo__field button {
		padding: 0 0.5rem;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.search-demo__collections {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}

	.search-demo__collections button {
		flex: 0 0 auto;
		border: var(--border-hairline) solid var(--border-subtle);
		padding: 0.5rem 0.75rem;
	}

	.search-demo__collections button.active {
		border-color: var(--border-default);
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.search-demo__meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.search-demo__results {
		display: grid;
		min-height: 16rem;
		align-content: start;
	}

	.search-demo__results article {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto;
		align-items: start;
		gap: 1rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem 0;
		animation: result-in var(--motion-standard) var(--ease-out) both;
	}

	.search-demo__glyph {
		display: grid;
		width: 3rem;
		height: 3rem;
		place-items: center;
		border-radius: var(--radius-control);
		background: var(--surface-accent);
		font-family: var(--font-display);
		font-size: 1.75rem;
	}

	.search-demo__results article > div:nth-child(2) {
		display: grid;
		min-width: 0;
		gap: 0.25rem;
	}

	.search-demo__results article p {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.search-demo__results h3 {
		margin: 0;
		font-family: var(--font-times);
		font-size: 1.125rem;
		font-weight: var(--font-weight-regular);
	}

	.search-demo__results small {
		color: var(--text-muted);
	}

	.search-demo__results blockquote {
		margin: 0.35rem 0 0;
		color: var(--text-muted);
		font-family: var(--font-editorial);
		font-style: italic;
	}

	.search-demo__empty {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 0.5rem;
		min-height: 16rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		text-align: center;
	}

	.search-demo__empty p {
		margin: 0;
		color: var(--text-muted);
	}

	@keyframes result-in {
		from {
			opacity: 0;
			transform: translateY(0.35rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 36rem) {
		.search-demo__field button {
			display: none;
		}

		.search-demo__meta span:last-child,
		.search-demo__results blockquote {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.search-demo__results article {
			animation: none;
		}
	}
</style>
