<script lang="ts">
	import { onMount } from 'svelte';

	const steps = [
		{
			eyebrow: '01 / Capture',
			title: 'The useful part is buried.',
			body: 'Tabs, messages, screenshots, and half-finished notes keep arriving. The link you need is somewhere in the pile.',
			metric: '38 open tabs'
		},
		{
			eyebrow: '02 / Extract',
			title: 'Pasted finds the signal.',
			body: 'Drop in the whole messy conversation. Pasted detects links, dates, titles, and context before anything is saved.',
			metric: '6 useful links'
		},
		{
			eyebrow: '03 / Organize',
			title: 'You decide where it belongs.',
			body: 'Review the clean result, choose what stays, and place it into a collection with a reminder or a few tags.',
			metric: '2 collections'
		},
		{
			eyebrow: '04 / Return',
			title: 'Then find it in seconds.',
			body: 'Search by title, note, domain, or tag. The surrounding noise can disappear because the useful part is ready.',
			metric: '1 calm answer'
		}
	];

	let section: HTMLElement;
	let reducedMotion = $state(true);
	let active = $state(0);
	let progress = $state(0);
	const current = $derived(steps[active] ?? steps[0]!);

	function updateProgress() {
		if (reducedMotion || !section) return;
		const rect = section.getBoundingClientRect();
		const distance = Math.max(1, section.offsetHeight - window.innerHeight);
		progress = Math.min(1, Math.max(0, -rect.top / distance));
		active = Math.min(steps.length - 1, Math.floor(progress * steps.length));
	}

	function goToStep(index: number) {
		if (!section || reducedMotion) return;
		const distance = section.offsetHeight - window.innerHeight;
		const top = window.scrollY + section.getBoundingClientRect().top;
		window.scrollTo({
			top: top + distance * (index / (steps.length - 1)),
			behavior: 'smooth'
		});
	}

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const syncPreference = () => {
			reducedMotion = media.matches;
			if (!reducedMotion) requestAnimationFrame(updateProgress);
		};
		syncPreference();
		window.addEventListener('scroll', updateProgress, { passive: true });
		window.addEventListener('resize', updateProgress);
		media.addEventListener('change', syncPreference);
		return () => {
			window.removeEventListener('scroll', updateProgress);
			window.removeEventListener('resize', updateProgress);
			media.removeEventListener('change', syncPreference);
		};
	});
</script>

<section
	bind:this={section}
	id="features"
	class="chaos-story"
	class:chaos-story--reduced={reducedMotion}
	aria-labelledby="chaos-title"
>
	{#if reducedMotion}
		<div class="reduced-story">
			<header>
				<p class="section-label">From noise to knowledge</p>
				<h2 id="chaos-title">A calmer path through digital clutter.</h2>
			</header>
			<div class="reduced-story__steps">
				{#each steps as step, index (step.eyebrow)}
					<article>
						{@render StoryVisual(index)}
						<div>
							<p class="section-label">{step.eyebrow}</p>
							<h3>{step.title}</h3>
							<p>{step.body}</p>
							<strong>{step.metric}</strong>
						</div>
					</article>
				{/each}
			</div>
		</div>
	{:else}
		<div class="sticky-story">
			<div class="story-copy">
				<p class="section-label">From noise to knowledge</p>
				<div class="story-copy__count" aria-hidden="true">
					<span>{String(active + 1).padStart(2, '0')}</span>
					<span>/</span>
					<span>04</span>
				</div>
				{#key active}
					<div class="story-copy__active">
						<p class="section-label">{current.eyebrow}</p>
						<h2 id="chaos-title">{current.title}</h2>
						<p>{current.body}</p>
						<strong>{current.metric}</strong>
					</div>
				{/key}
				<div class="story-progress" aria-label="Story steps">
					<div class="story-progress__track" aria-hidden="true">
						<span style={`width: ${Math.max(4, progress * 100)}%`}></span>
					</div>
					<div class="story-progress__buttons">
						{#each steps as step, index (step.eyebrow)}
							<button
								type="button"
								class:active={active === index}
								aria-label={`Show ${step.eyebrow}`}
								aria-current={active === index ? 'step' : undefined}
								onclick={() => goToStep(index)}>{index + 1}</button
							>
						{/each}
					</div>
				</div>
			</div>
			<div class="story-visual" aria-hidden="true">
				{#key active}{@render StoryVisual(active)}{/key}
			</div>
		</div>
	{/if}
</section>

{#snippet StoryVisual(step: number)}
	<div class={`visual visual--${step}`} aria-hidden="true">
		{#if step === 0}
			<div class="chaos-note note-a">Watch later<br /><small>video.example/design</small></div>
			<div class="chaos-note note-b">Can you find that article?</div>
			<div class="chaos-note note-c">27 tabs</div>
			<div class="chaos-note note-d">Remind me Friday</div>
			<div class="chaos-note note-e">notes-final-v4.txt</div>
			<svg class="chaos-line" viewBox="0 0 300 220"
				><path
					d="M20 170C70 40 130 230 280 35"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				/></svg
			>
		{:else if step === 1}
			<div class="extract-source">
				<span></span><span></span><span></span><span></span><span></span>
			</div>
			<div class="extract-arrow">
				<svg viewBox="0 0 60 24"
					><path
						d="M2 12h52m-8-8 8 8-8 8"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					/></svg
				>
			</div>
			<div class="extract-results">
				<p><strong>Local-first tools</strong><small>workbench.example</small></p>
				<p><strong>Quiet interfaces</strong><small>fieldnotes.example</small></p>
				<p><strong>Research archive</strong><small>smallweb.example</small></p>
			</div>
		{:else if step === 2}
			<div class="organize-head"><span>3 links selected</span><strong>Choose a home</strong></div>
			<div class="collection-stack">
				<div><span>01</span><strong>Reading list</strong><small>24 items</small></div>
				<div class="chosen">
					<span>02</span><strong>Project Atlas</strong><small>18 items</small>
				</div>
				<div><span>03</span><strong>Weekend ideas</strong><small>9 items</small></div>
			</div>
			<div class="organize-tag">+ Reminder Friday</div>
		{:else}
			<div class="calm-search">
				<svg viewBox="0 0 20 20" width="18" height="18"
					><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path
						d="m13.5 13.5 4 4"
						stroke="currentColor"
					/></svg
				>
				<span>local first</span>
			</div>
			<div class="calm-result">
				<p class="section-label">Project Atlas</p>
				<strong>A practical guide to local-first tools</strong>
				<small>workbench.example/local-first</small>
				<div><span>Research</span><span>Saved 4 days ago</span></div>
			</div>
			<div class="calm-check" aria-hidden="true">✓</div>
		{/if}
	</div>
{/snippet}

<style>
	.chaos-story {
		position: relative;
		min-height: 340svh;
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.sticky-story {
		position: sticky;
		top: 0;
		display: grid;
		width: min(100%, var(--page-max-width));
		height: 100svh;
		grid-template-columns: minmax(0, 0.85fr) minmax(28rem, 1.15fr);
		align-items: center;
		gap: clamp(2rem, 7vw, 7rem);
		margin: 0 auto;
		padding: 5rem var(--page-gutter);
		overflow: hidden;
	}

	.section-label {
		margin: 0;
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.story-copy__count {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: clamp(2rem, 6vh, 5rem) 0 1.5rem;
		color: var(--color-muted-sage);
		font-family: var(--font-times);
	}

	.story-copy__count span:first-child {
		color: var(--surface-accent);
		font-size: clamp(4rem, 8vw, 8rem);
		line-height: 0.8;
	}

	.story-copy__active {
		animation: copy-in 360ms var(--ease-out) both;
	}

	h2,
	h3 {
		margin: 0.6rem 0 0;
		font-family: var(--font-display);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.92;
	}

	h2 {
		max-width: 10ch;
		font-size: clamp(3.25rem, 6.5vw, 7rem);
	}

	h3 {
		font-size: clamp(2.25rem, 4vw, 4rem);
	}

	.story-copy__active > p:not(.section-label),
	.reduced-story article p:not(.section-label) {
		max-width: 42ch;
		margin: 1.5rem 0;
		color: var(--color-muted-sage);
		font-size: var(--text-body);
		font-weight: var(--font-weight-extralight);
		line-height: var(--leading-body);
	}

	.story-copy__active > strong,
	.reduced-story article strong {
		color: var(--surface-accent);
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.story-progress {
		max-width: 26rem;
		margin-top: clamp(2rem, 6vh, 5rem);
	}

	.story-progress__track {
		height: 1px;
		background: color-mix(in srgb, var(--color-muted-sage) 35%, transparent);
	}

	.story-progress__track span {
		display: block;
		height: 100%;
		background: var(--surface-accent);
		transition: width 80ms linear;
	}

	.story-progress__buttons {
		display: flex;
		justify-content: space-between;
		margin-top: 0.75rem;
	}

	.story-progress button {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		place-items: center;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: var(--color-muted-sage);
		font-family: var(--font-times);
	}

	.story-progress button.active {
		background: var(--surface-accent);
		color: var(--color-typesetter-ink);
	}

	.story-progress button:focus-visible {
		outline-color: var(--focus-ring-inverse);
	}

	.story-visual {
		display: grid;
		min-height: min(40rem, 72vh);
		place-items: center;
	}

	.visual {
		position: relative;
		width: min(100%, 42rem);
		aspect-ratio: 1.12;
		border: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 45%, transparent);
		border-radius: var(--radius-image);
		background:
			linear-gradient(
				color-mix(in srgb, var(--color-muted-sage) 12%, transparent) 1px,
				transparent 1px
			),
			linear-gradient(
				90deg,
				color-mix(in srgb, var(--color-muted-sage) 12%, transparent) 1px,
				transparent 1px
			),
			var(--color-slate-verdant);
		background-size: 3rem 3rem;
		overflow: hidden;
		animation: visual-in 500ms var(--ease-out) both;
	}

	.chaos-note {
		position: absolute;
		width: clamp(9rem, 30%, 13rem);
		border: var(--border-hairline) solid var(--color-muted-sage);
		background: var(--surface-canvas);
		color: var(--text-primary);
		padding: 1rem;
		font-family: var(--font-times);
		line-height: 1.2;
	}

	.chaos-note small {
		color: var(--text-muted);
	}

	.note-a {
		top: 12%;
		left: 8%;
		transform: rotate(-8deg);
	}
	.note-b {
		top: 18%;
		right: 6%;
		transform: rotate(6deg);
	}
	.note-c {
		top: 48%;
		left: 30%;
		transform: rotate(11deg);
	}
	.note-d {
		right: 14%;
		bottom: 9%;
		transform: rotate(-5deg);
	}
	.note-e {
		bottom: 12%;
		left: 5%;
		transform: rotate(4deg);
	}

	.chaos-line {
		position: absolute;
		inset: 18% 8%;
		width: 84%;
		height: 68%;
		color: var(--surface-accent);
	}

	.extract-source,
	.extract-results,
	.collection-stack {
		position: absolute;
		display: grid;
		gap: 0.65rem;
	}

	.extract-source {
		top: 18%;
		bottom: 18%;
		left: 8%;
		width: 28%;
		align-content: center;
	}

	.extract-source span {
		height: 0.75rem;
		background: color-mix(in srgb, var(--color-muted-sage) 35%, transparent);
	}

	.extract-source span:nth-child(2),
	.extract-source span:nth-child(4) {
		width: 65%;
	}

	.extract-arrow {
		position: absolute;
		top: 48%;
		left: 39%;
		width: 14%;
		color: var(--surface-accent);
	}

	.extract-results {
		top: 19%;
		right: 7%;
		width: 39%;
	}

	.extract-results p,
	.collection-stack div,
	.calm-result {
		display: grid;
		gap: 0.25rem;
		margin: 0;
		border: var(--border-hairline) solid var(--color-muted-sage);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: var(--text-primary);
		padding: 1rem;
	}

	.extract-results strong,
	.collection-stack strong,
	.calm-result strong {
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.extract-results small,
	.collection-stack small,
	.calm-result small {
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	.organize-head {
		position: absolute;
		top: 10%;
		left: 10%;
		display: grid;
		gap: 0.35rem;
	}

	.organize-head span,
	.organize-tag {
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.organize-head strong {
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
	}

	.collection-stack {
		top: 32%;
		right: 10%;
		left: 10%;
	}

	.collection-stack div {
		grid-template-columns: 2rem 1fr auto;
		align-items: center;
	}

	.collection-stack .chosen {
		border-color: var(--surface-accent);
		background: color-mix(in srgb, var(--surface-accent) 10%, var(--surface-canvas));
	}

	.collection-stack span {
		font-family: var(--font-times);
	}

	.organize-tag {
		position: absolute;
		bottom: 10%;
		left: 10%;
		border: var(--border-hairline) solid var(--color-muted-sage);
		padding: 0.65rem;
	}

	.calm-search {
		position: absolute;
		top: 12%;
		right: 10%;
		left: 10%;
		display: flex;
		min-height: 3.25rem;
		align-items: center;
		gap: 0.75rem;
		border: var(--border-hairline) solid var(--color-muted-sage);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: var(--text-primary);
		padding: 0 1rem;
	}

	.calm-result {
		position: absolute;
		top: 32%;
		right: 10%;
		left: 10%;
		gap: 0.65rem;
		padding: 1.5rem;
	}

	.calm-result > strong {
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 4vw, 3.25rem);
		letter-spacing: -0.03em;
		line-height: 0.95;
	}

	.calm-result > div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	.calm-check {
		position: absolute;
		right: 8%;
		bottom: 8%;
		display: grid;
		width: 3.25rem;
		height: 3.25rem;
		place-items: center;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		color: var(--color-typesetter-ink);
		font-size: 1.5rem;
	}

	.chaos-story--reduced {
		min-height: auto;
	}

	.reduced-story {
		width: min(100%, var(--page-max-width));
		margin: 0 auto;
		padding: var(--section-gap) var(--page-gutter);
	}

	.reduced-story > header h2 {
		max-width: 12ch;
		margin-bottom: 3rem;
	}

	.reduced-story__steps {
		display: grid;
		gap: 4rem;
	}

	.reduced-story article {
		display: grid;
		grid-template-columns: minmax(18rem, 1fr) 1fr;
		align-items: center;
		gap: clamp(2rem, 7vw, 7rem);
	}

	.reduced-story article:nth-child(even) .visual {
		order: 2;
	}

	@keyframes copy-in {
		from {
			opacity: 0;
			transform: translateY(0.75rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes visual-in {
		from {
			opacity: 0;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (max-width: 62rem) {
		.chaos-story {
			min-height: 300svh;
		}

		.sticky-story {
			grid-template-columns: 1fr;
			grid-template-rows: auto minmax(16rem, 1fr);
			align-content: center;
			gap: 1.5rem;
			padding-block: 4rem 2rem;
		}

		.story-copy__count {
			display: none;
		}

		h2 {
			font-size: clamp(2.75rem, 8vw, 5rem);
		}

		.story-copy__active > p:not(.section-label) {
			margin: 0.75rem 0;
			font-size: var(--text-body-compact);
		}

		.story-progress {
			margin-top: 1.25rem;
		}

		.story-progress__buttons {
			display: none;
		}

		.story-visual {
			min-height: 0;
		}

		.visual {
			width: min(100%, 35rem);
			max-height: 46vh;
		}

		.reduced-story article {
			grid-template-columns: 1fr;
		}

		.reduced-story article:nth-child(even) .visual {
			order: initial;
		}
	}

	@media (max-width: 38rem) {
		.sticky-story {
			padding-top: 2.5rem;
		}

		.visual {
			aspect-ratio: 1;
		}

		.chaos-note {
			font-size: 0.75rem;
			padding: 0.625rem;
		}

		.extract-results p,
		.collection-stack div,
		.calm-result {
			padding: 0.65rem;
		}

		.extract-results strong,
		.collection-stack strong {
			font-size: 0.6875rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.story-copy__active,
		.visual {
			animation: none;
		}
	}
</style>
