<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Button from '$lib/components/ui/Button.svelte';

	type Stage = 'chat' | 'fading' | 'links' | 'saving' | 'saved';
	type DemoLink = {
		id: number;
		title: string;
		url: string;
		domain: string;
		tag: string;
	};

	const demoLinks: DemoLink[] = [
		{
			id: 1,
			title: 'A calmer way to review a busy week',
			url: 'fieldnotes.example/calm-review',
			domain: 'fieldnotes.example',
			tag: 'Read later'
		},
		{
			id: 2,
			title: 'Research notes for the tiny web',
			url: 'smallweb.example/research-notes',
			domain: 'smallweb.example',
			tag: 'Research'
		},
		{
			id: 3,
			title: 'A practical guide to local-first tools',
			url: 'workbench.example/local-first',
			domain: 'workbench.example',
			tag: 'Tools'
		}
	];

	let stage = $state<Stage>('chat');
	let selected = $state<number[]>(demoLinks.map((link) => link.id));
	let reducedMotion = false;
	const timers = new SvelteSet<ReturnType<typeof setTimeout>>();
	const selectedCount = $derived(selected.length);
	const selectedLinks = $derived(demoLinks.filter((link) => selected.includes(link.id)));
	const status = $derived.by(() => {
		if (stage === 'chat') return 'Conversation ready to import.';
		if (stage === 'fading') return 'Scanning the conversation for links.';
		if (stage === 'links') return `${selectedCount} of ${demoLinks.length} links selected.`;
		if (stage === 'saving') return 'Adding selected links to Reading list.';
		return `${selectedCount} links added to Reading list.`;
	});

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	onDestroy(() => timers.forEach(clearTimeout));

	function afterMotion(callback: () => void, duration: number) {
		if (reducedMotion) {
			callback();
			return;
		}
		const timer = setTimeout(() => {
			timers.delete(timer);
			callback();
		}, duration);
		timers.add(timer);
	}

	function extractLinks() {
		if (stage !== 'chat') return;
		stage = 'fading';
		afterMotion(() => (stage = 'links'), 420);
	}

	function toggleLink(id: number) {
		selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
	}

	function saveLinks() {
		if (stage !== 'links' || selectedCount === 0) return;
		stage = 'saving';
		afterMotion(() => (stage = 'saved'), 520);
	}

	function resetDemo() {
		timers.forEach(clearTimeout);
		timers.clear();
		selected = demoLinks.map((link) => link.id);
		stage = 'chat';
	}
</script>

<section class="demo" aria-labelledby="import-demo-title">
	<div class="demo__bar">
		<div class="window-dots" aria-hidden="true"><span></span><span></span><span></span></div>
		<p id="import-demo-title">New import</p>
		<span class="demo__secure">
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path
					d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3 7h10v7H3z"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>
			</svg>
			Local preview
		</span>
	</div>

	<div class="demo__workspace">
		{#if stage === 'chat' || stage === 'fading'}
			<div class:conversation--fading={stage === 'fading'} class="conversation">
				<p class="conversation__label">Pasted from team chat</p>
				<div class="message message--other">
					<span>ML</span>
					<p>This review method helped me clear the backlog: fieldnotes.example/calm-review</p>
				</div>
				<div class="message message--self">
					<span>YOU</span>
					<p>
						Saving it. Also found smallweb.example/research-notes and workbench.example/local-first
					</p>
				</div>
				<div class="message message--other">
					<span>ML</span>
					<p>Perfect. Put all three in our reading list?</p>
				</div>
				<div class="demo__action">
					<Button onclick={extractLinks} loading={stage === 'fading'} loadingLabel="Finding links">
						Find the useful parts
					</Button>
					<span>3 links detected</span>
				</div>
			</div>
		{:else if stage === 'links' || stage === 'saving'}
			<div class="link-picker">
				<div class="link-picker__heading">
					<div>
						<p class="micro-label">Links found</p>
						<h3>Keep what matters.</h3>
					</div>
					<span>{selectedCount}/{demoLinks.length} selected</span>
				</div>
				<div class="link-list" aria-label="Links found in conversation">
					{#each demoLinks as link, index (link.id)}
						<label
							class="link-card"
							class:link-card--selected={selected.includes(link.id)}
							style={`--card-index: ${index}`}
						>
							<input
								type="checkbox"
								checked={selected.includes(link.id)}
								disabled={stage === 'saving'}
								onchange={() => toggleLink(link.id)}
							/>
							<span class="link-card__check" aria-hidden="true">
								<svg viewBox="0 0 16 16" width="14" height="14"
									><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" /></svg
								>
							</span>
							<span class="link-card__copy">
								<strong>{link.title}</strong>
								<small>{link.url}</small>
							</span>
							<span class="link-card__tag">{link.tag}</span>
						</label>
					{/each}
				</div>
				<div class="demo__action demo__action--spread">
					<Button variant="quiet" onclick={resetDemo} disabled={stage === 'saving'}
						>Start over</Button
					>
					<Button
						onclick={saveLinks}
						disabled={selectedCount === 0}
						loading={stage === 'saving'}
						loadingLabel="Adding links"
					>
						Add {selectedCount} to Reading list
					</Button>
				</div>
			</div>
		{:else}
			<div class="collection-result">
				<div class="collection-result__top">
					<span class="collection-result__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22"
							><path
								d="M4 5h16v15H4zM8 2h8v6H8z"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							/></svg
						>
					</span>
					<div>
						<p class="micro-label">Collection updated</p>
						<h3>Reading list</h3>
					</div>
					<span>{selectedCount} new</span>
				</div>
				<ul>
					{#each selectedLinks as link, index (link.id)}
						<li style={`--card-index: ${index}`}>
							<span>{String(index + 1).padStart(2, '0')}</span>
							<div><strong>{link.title}</strong><small>{link.domain}</small></div>
							<span class="saved-mark">Saved</span>
						</li>
					{/each}
				</ul>
				<div class="demo__action demo__action--spread">
					<p>Conversation gone. Useful parts kept.</p>
					<Button variant="outline" onclick={resetDemo}>Run it again</Button>
				</div>
			</div>
		{/if}
	</div>
	<p class="sr-only" aria-live="polite" aria-atomic="true">{status}</p>
</section>

<style>
	.demo {
		width: 100%;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-canvas);
		overflow: hidden;
	}

	.demo__bar {
		display: grid;
		min-height: 3.5rem;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 0.75rem 1rem;
	}

	.demo__bar p,
	.demo__secure,
	.conversation__label,
	.micro-label {
		margin: 0;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.window-dots {
		display: flex;
		gap: 0.35rem;
	}

	.window-dots span {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--radius-full);
		background: var(--color-muted-sage);
	}

	.window-dots span:first-child {
		background: var(--surface-accent);
	}

	.demo__secure {
		display: inline-flex;
		align-items: center;
		justify-self: end;
		gap: 0.375rem;
		color: var(--text-muted);
	}

	.demo__workspace {
		min-height: 37rem;
		padding: clamp(1.25rem, 4vw, 2.5rem);
	}

	.conversation,
	.link-picker,
	.collection-result {
		display: grid;
		gap: 1.25rem;
		animation: view-in 420ms var(--ease-out) both;
	}

	.conversation {
		transition:
			opacity 400ms var(--ease-out),
			transform 400ms var(--ease-out),
			filter 400ms var(--ease-out);
	}

	.conversation--fading {
		opacity: 0;
		filter: blur(3px);
		transform: scale(0.985);
	}

	.conversation__label,
	.micro-label {
		color: var(--text-muted);
	}

	.message {
		display: grid;
		max-width: 82%;
		grid-template-columns: 2.25rem 1fr;
		align-items: start;
		gap: 0.75rem;
	}

	.message--self {
		justify-self: end;
	}

	.message > span {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-full);
		font-size: 0.625rem;
		font-weight: var(--font-weight-medium);
	}

	.message p {
		margin: 0;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: 0 var(--radius-control) var(--radius-control) var(--radius-control);
		background: color-mix(in srgb, var(--color-echo-green) 30%, var(--surface-canvas));
		padding: 0.875rem 1rem;
		font-family: var(--font-times);
		line-height: 1.35;
	}

	.message--self p {
		border-color: var(--color-highlighter-green);
		border-radius: var(--radius-control) 0 var(--radius-control) var(--radius-control);
		background: color-mix(in srgb, var(--surface-accent) 13%, var(--surface-canvas));
	}

	.demo__action {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.demo__action--spread {
		justify-content: space-between;
	}

	.demo__action > span,
	.demo__action > p {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.link-picker__heading,
	.collection-result__top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	h3 {
		margin: 0.25rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.25rem, 5vw, 4rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	.link-picker__heading > span,
	.collection-result__top > span:last-child {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.link-list {
		display: grid;
		gap: 0.625rem;
	}

	.link-card {
		display: grid;
		min-height: 5rem;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.875rem;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: var(--radius-control);
		padding: 0.875rem;
		animation: card-in 380ms var(--ease-out) calc(var(--card-index) * 80ms) both;
		transition:
			border-color var(--motion-fast) var(--ease-out),
			background-color var(--motion-fast) var(--ease-out);
	}

	.link-card:hover,
	.link-card--selected {
		border-color: var(--border-default);
		background: color-mix(in srgb, var(--surface-accent) 7%, var(--surface-canvas));
	}

	.link-card input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.link-card:has(input:focus-visible) {
		outline: 3px solid var(--focus-ring);
		outline-offset: 3px;
	}

	.link-card__check {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: 0.25rem;
		color: transparent;
	}

	.link-card--selected .link-card__check {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.link-card__copy {
		display: grid;
		min-width: 0;
		gap: 0.25rem;
	}

	.link-card__copy strong,
	.collection-result li strong {
		overflow: hidden;
		font-size: var(--text-body-compact);
		font-weight: var(--font-weight-medium);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.link-card__copy small,
	.collection-result li small {
		overflow: hidden;
		color: var(--text-muted);
		font-size: var(--text-body-small);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.link-card__tag,
	.saved-mark {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.collection-result__icon {
		display: grid;
		width: 3.25rem;
		height: 3.25rem;
		flex: 0 0 auto;
		place-items: center;
		background: var(--surface-accent);
		border-radius: var(--radius-control);
	}

	.collection-result__top {
		display: grid;
		grid-template-columns: auto 1fr auto;
	}

	.collection-result ul {
		display: grid;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.collection-result li {
		display: grid;
		min-height: 4.75rem;
		grid-template-columns: 2rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		animation: card-in 380ms var(--ease-out) calc(var(--card-index) * 90ms) both;
	}

	.collection-result li > span:first-child {
		color: var(--text-muted);
		font-family: var(--font-times);
	}

	.collection-result li > div {
		display: grid;
		min-width: 0;
		gap: 0.15rem;
	}

	.saved-mark {
		color: var(--color-newsprint-gray);
	}

	@keyframes view-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(0.625rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 42rem) {
		.demo__bar {
			grid-template-columns: 1fr auto;
		}

		.window-dots {
			display: none;
		}

		.demo__workspace {
			min-height: 39rem;
		}

		.message {
			max-width: 100%;
		}

		.link-card {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.link-card__tag {
			display: none;
		}

		.demo__action--spread {
			align-items: stretch;
			flex-direction: column-reverse;
		}

		.collection-result__top {
			grid-template-columns: auto 1fr;
		}

		.collection-result__top > span:last-child {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.conversation,
		.link-picker,
		.collection-result,
		.link-card,
		.collection-result li {
			animation: none;
		}

		.conversation--fading {
			display: none;
		}
	}
</style>
