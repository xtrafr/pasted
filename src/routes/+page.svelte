<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ChaosStory,
		CollectionSearch,
		DashboardPreview,
		ImportDemo,
		LandingFooter,
		LandingNav,
		Reveal
	} from '$lib/components/landing';

	let reminderDone = $state(false);
</script>

<svelte:head>
	<title>Pasted | Save it now. Find it later.</title>
	<meta
		name="description"
		content="Pasted turns chats, documents, bookmarks, and loose notes into a private, searchable library of links, collections, and reminders."
	/>
	<meta property="og:title" content="Pasted | Save it now. Find it later." />
	<meta
		property="og:description"
		content="Keep the useful parts of your digital life without keeping the noise."
	/>
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>
<LandingNav />

<main id="main-content">
	<section class="hero" aria-labelledby="hero-title">
		<div class="hero__topline">
			<p>Private link workspace</p>
			<p>Made for the useful parts</p>
		</div>
		<h1 id="hero-title">
			<span class="hero__line">Save it</span>
			<span class="hero__line hero__line--with-art">
				<span class="hero-art" aria-hidden="true">
					<svg viewBox="0 0 220 132">
						<rect width="220" height="132" fill="currentColor" />
						<path
							d="M20 98 70 34l30 40 27-28 72 52"
							fill="none"
							stroke="#fafffa"
							stroke-width="3"
						/>
						<circle cx="170" cy="34" r="14" fill="#2bee4b" />
						<path d="M22 111h176" stroke="#fafffa" stroke-width="2" />
					</svg>
				</span>
				now.
			</span>
			<span class="hero__line hero__line--editorial">Find it later.</span>
		</h1>
		<div class="hero__bottom">
			<p class="hero__intro">
				Paste a chat, document, or bookmark export. Pasted finds the links, lets you choose what
				matters, and gives every saved item a collection, note, and reminder.
			</p>
			<div class="hero__actions">
				<a class="primary-link" href={resolve('/register')}>Start your library</a>
				<a class="text-link" href="#demo">Try the import demo</a>
			</div>
		</div>
		<div class="hero__facts" aria-label="Product principles">
			<div><strong>07</strong><span>Import formats</span></div>
			<div><strong>01</strong><span>Searchable home</span></div>
			<div><strong>00</strong><span>Advertising trackers</span></div>
		</div>
	</section>

	<section class="demo-section" id="demo" aria-labelledby="demo-heading">
		<Reveal>
			<div class="section-heading section-heading--split">
				<div>
					<p class="section-label">See the signal appear</p>
					<h2 id="demo-heading">Paste the mess.<br /><span>Keep the signal.</span></h2>
				</div>
				<p>
					This is a live demo. Extract the links, choose what belongs, then place the useful parts
					into a collection.
				</p>
			</div>
		</Reveal>
		<Reveal delay={100}>
			<div class="demo-frame"><ImportDemo /></div>
		</Reveal>
	</section>

	<ChaosStory />

	<section class="dashboard-section" aria-labelledby="dashboard-title">
		<Reveal>
			<div class="section-heading section-heading--center">
				<p class="section-label">Your personal link desk</p>
				<h2 id="dashboard-title">Everything useful.<br /><span>Nothing in the way.</span></h2>
				<p>
					A calm dashboard for links, notes, collections, and due dates. Dense enough to be
					powerful, quiet enough to stay readable.
				</p>
			</div>
		</Reveal>
		<Reveal delay={100}>
			<div class="dashboard-frame"><DashboardPreview /></div>
		</Reveal>
	</section>

	<section class="search-section" aria-labelledby="search-title">
		<div class="search-section__inner">
			<Reveal>
				<div class="feature-copy">
					<p class="section-label">Collections and search</p>
					<h2 id="search-title">A place for everything. A search across all of it.</h2>
					<p>
						Collections preserve intent. Full-library search checks titles, domains, notes, and tags
						at once. Try the search with “local”, then clear it or choose a collection.
					</p>
					<ul class="feature-list">
						<li><span>01</span>Search notes and metadata together</li>
						<li><span>02</span>Filter without losing context</li>
						<li><span>03</span>Move links between collections anytime</li>
					</ul>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<CollectionSearch />
			</Reveal>
		</div>
	</section>

	<section class="reminder-section" aria-labelledby="reminder-title">
		<div class="reminder-section__inner">
			<Reveal>
				<div class="reminder-board">
					<header>
						<div>
							<p class="section-label">Upcoming</p>
							<h3>Things worth returning to</h3>
						</div>
						<span>3 reminders</span>
					</header>
					<div class="reminder-day">
						<p>Today</p>
						<label class:done={reminderDone}>
							<input type="checkbox" bind:checked={reminderDone} />
							<span class="reminder-check" aria-hidden="true">✓</span>
							<span class="reminder-time">14:30</span>
							<span class="reminder-copy">
								<strong>Review local-first architecture notes</strong>
								<small>Project Atlas · workbench.example</small>
							</span>
						</label>
					</div>
					<div class="reminder-day">
						<p>Friday</p>
						<div class="reminder-row">
							<span class="reminder-check" aria-hidden="true"></span>
							<span class="reminder-time">09:00</span>
							<span class="reminder-copy"
								><strong>Weekly reading review</strong><small>Reading list · 5 unread</small></span
							>
						</div>
					</div>
					<footer><span>Next week</span><span>One gentle nudge, never a noisy feed.</span></footer>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<div class="feature-copy feature-copy--light">
					<p class="section-label">Reminders with context</p>
					<h2 id="reminder-title">Remember the link when it becomes useful.</h2>
					<p>
						A saved page is only valuable if it returns at the right moment. Add a date while
						importing or later, then see the note and collection beside the reminder.
					</p>
					<div class="feature-stat">
						<strong>Not another inbox.</strong><span
							>Just the item, its context, and the time you chose.</span
						>
					</div>
				</div>
			</Reveal>
		</div>
	</section>

	<section class="portability-section" id="import-export" aria-labelledby="portability-title">
		<div class="portability-section__inner">
			<Reveal>
				<div class="feature-copy">
					<p class="section-label">Import and export</p>
					<h2 id="portability-title">Bring your history. Keep your exit.</h2>
					<p>
						Start with the bookmarks, chats, and notes you already have. Export clean data whenever
						you want. Your archive never becomes a trap.
					</p>
					<div class="portability-actions">
						<a class="primary-link" href={resolve('/register')}>Import your first file</a>
						<a class="text-link" href="#formats">See every format</a>
					</div>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<div
					class="data-pipeline"
					aria-label="Files flow into a Pasted collection and back out as portable data"
				>
					<div class="data-pipeline__header">
						<span>Portable by design</span><span>In and out</span>
					</div>
					<div class="data-pipeline__flow">
						<div class="file-stack" aria-hidden="true">
							<span>CSV</span><span>JSON</span><span>HTML</span><span>MD</span>
						</div>
						<svg viewBox="0 0 90 30" aria-hidden="true"
							><path
								d="M2 15h80m-9-9 9 9-9 9"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							/></svg
						>
						<div class="pipeline-library">
							<strong>Pasted</strong><small>128 clean links</small>
							<div><span></span><span></span><span></span></div>
						</div>
						<svg viewBox="0 0 90 30" aria-hidden="true"
							><path
								d="M2 15h80m-9-9 9 9-9 9"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							/></svg
						>
						<div class="export-box">
							<span>EXPORT</span><strong>Your archive</strong><small>Readable anywhere</small>
						</div>
					</div>
					<footer>
						<span>No lock-in</span><span>No proprietary maze</span><span>No missing context</span>
					</footer>
				</div>
			</Reveal>
		</div>
	</section>

	<section class="privacy-section" id="privacy" aria-labelledby="privacy-title">
		<div class="privacy-section__inner">
			<Reveal>
				<div class="privacy-copy">
					<p class="section-label">Privacy and self-hosting</p>
					<h2 id="privacy-title">Your archive should answer to you.</h2>
					<p>
						Pasted is built around private workspaces and portable data. Run the hosted version or
						place the application on infrastructure you control.
					</p>
					<ul>
						<li>
							<span>01</span>
							<div>
								<strong>No advertising profile</strong><small
									>Your saved interests are not inventory.</small
								>
							</div>
						</li>
						<li>
							<span>02</span>
							<div>
								<strong>Private by default</strong><small
									>Libraries belong to their account owner.</small
								>
							</div>
						</li>
						<li>
							<span>03</span>
							<div>
								<strong>Portable storage</strong><small
									>Import and export stay first-class workflows.</small
								>
							</div>
						</li>
					</ul>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<div class="terminal" id="self-hosting">
					<header>
						<span></span><span></span><span></span><strong>pasted / self-host</strong>
					</header>
					<div class="terminal__body">
						<p><span>$</span> git clone pasted.example/app</p>
						<p><span>$</span> cp .env.example .env</p>
						<p><span>$</span> docker compose up -d</p>
						<p class="terminal__success">✓ Pasted is ready on your server</p>
						<div class="terminal__meter"><span></span></div>
						<footer>
							<span>App</span><strong>online</strong><span>Database</span><strong>connected</strong>
						</footer>
					</div>
				</div>
			</Reveal>
		</div>
	</section>

	<section class="formats-section" id="formats" aria-labelledby="formats-title">
		<Reveal>
			<div class="section-heading section-heading--split">
				<div>
					<p class="section-label">Formats</p>
					<h2 id="formats-title">Your old files already know the way in.</h2>
				</div>
				<p>
					Use direct text, structured exports, browser bookmarks, or chat history. Review every
					detected link before saving.
				</p>
			</div>
		</Reveal>
		<div class="format-list">
			<Reveal delay={40}
				><article>
					<span>01</span>
					<h3>Plain text</h3>
					<p>Paste notes, chats, and loose URL lists.</p>
					<strong>TXT</strong>
				</article></Reveal
			>
			<Reveal delay={80}
				><article>
					<span>02</span>
					<h3>Markdown</h3>
					<p>Keep link labels and useful surrounding text.</p>
					<strong>MD</strong>
				</article></Reveal
			>
			<Reveal delay={120}
				><article>
					<span>03</span>
					<h3>Browser bookmarks</h3>
					<p>Bring folders and bookmark titles with you.</p>
					<strong>HTML</strong>
				</article></Reveal
			>
			<Reveal delay={160}
				><article>
					<span>04</span>
					<h3>Structured data</h3>
					<p>Import rows and objects from other tools.</p>
					<strong>CSV / JSON</strong>
				</article></Reveal
			>
			<Reveal delay={200}
				><article>
					<span>05</span>
					<h3>WhatsApp exports</h3>
					<p>Extract the links from exported conversation text.</p>
					<strong>TXT</strong>
				</article></Reveal
			>
		</div>
	</section>

	<section class="closing-cta" aria-labelledby="cta-title">
		<Reveal>
			<div class="closing-cta__inner">
				<p class="section-label">Ready when you are</p>
				<h2 id="cta-title">Your future self is looking for this.</h2>
				<p>Start with one messy chat. Leave with a library you can actually use.</p>
				<div>
					<a class="primary-link" href={resolve('/register')}>Start free</a>
					<a class="text-link" href={resolve('/login')}>Sign in</a>
				</div>
			</div>
		</Reveal>
	</section>
</main>

<LandingFooter />

<style>
	.skip-link {
		position: fixed;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 100;
		background: var(--surface-accent);
		color: var(--color-typesetter-ink);
		padding: 0.75rem 1rem;
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
		transform: translateY(-180%);
		transition: transform var(--motion-fast) var(--ease-out);
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	.hero,
	.demo-section,
	.dashboard-section,
	.formats-section {
		width: min(100%, var(--page-max-width));
		margin: 0 auto;
		padding-inline: var(--page-gutter);
	}

	.hero {
		min-height: calc(100svh - 5rem);
		padding-top: clamp(2.5rem, 7vh, 6rem);
		padding-bottom: clamp(4rem, 9vh, 8rem);
	}

	.hero__topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-default);
		padding-bottom: 0.75rem;
		animation: hero-in 600ms var(--ease-out) both;
	}

	.hero__topline p,
	.section-label {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.hero h1 {
		margin: clamp(2rem, 5vw, 4.5rem) 0;
		font-family: var(--font-display);
		font-size: clamp(4.3rem, 14.8vw, 13.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.065em;
		line-height: 0.76;
	}

	.hero__line {
		display: flex;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 2rem);
		animation: hero-in 700ms var(--ease-out) both;
	}

	.hero__line:nth-child(2) {
		justify-content: flex-end;
		animation-delay: 80ms;
	}

	.hero__line:nth-child(3) {
		animation-delay: 160ms;
	}

	.hero__line--editorial {
		font-family: var(--font-editorial);
		font-size: 0.72em;
		font-style: italic;
		font-weight: var(--font-weight-light);
		letter-spacing: -0.045em;
	}

	.hero-art {
		display: inline-flex;
		width: clamp(6rem, 15vw, 13.75rem);
		aspect-ratio: 1.66;
		flex: 0 0 auto;
		border-radius: var(--radius-image);
		color: var(--color-slate-verdant);
		overflow: hidden;
		transform: rotate(-2deg);
	}

	.hero-art svg {
		width: 100%;
		height: 100%;
	}

	.hero__bottom {
		display: grid;
		grid-template-columns: minmax(20rem, 36rem) 1fr;
		align-items: end;
		gap: 2rem;
		animation: hero-in 700ms var(--ease-out) 220ms both;
	}

	.hero__intro {
		margin: 0;
		font-size: var(--text-body);
		line-height: var(--leading-body);
	}

	.hero__actions,
	.portability-actions,
	.closing-cta__inner > div {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
	}

	.primary-link {
		display: inline-flex;
		min-height: 3.25rem;
		align-items: center;
		justify-content: center;
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
		transition:
			transform var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-standard) var(--ease-out);
	}

	.primary-link:hover {
		box-shadow: var(--shadow-green-soft);
		transform: translateY(-1px);
	}

	.text-link {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		font-family: var(--font-times);
		font-size: var(--text-body-compact);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}

	.hero__facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		border-top: var(--border-hairline) solid var(--border-default);
		margin-top: clamp(3rem, 7vw, 6rem);
		padding-top: 1.25rem;
		animation: hero-in 700ms var(--ease-out) 300ms both;
	}

	.hero__facts div {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.hero__facts strong {
		color: var(--color-newsprint-gray);
		font-family: var(--font-times);
		font-size: clamp(2rem, 5vw, 4rem);
		font-weight: var(--font-weight-regular);
		line-height: 0.9;
	}

	.hero__facts span {
		max-width: 9ch;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		line-height: 1.2;
		text-transform: uppercase;
	}

	.demo-section,
	.dashboard-section,
	.formats-section {
		padding-top: clamp(5rem, 11vw, 10rem);
		padding-bottom: clamp(5rem, 11vw, 10rem);
	}

	.section-heading {
		margin-bottom: clamp(2.5rem, 6vw, 5rem);
	}

	.section-heading--split {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 0.5fr);
		align-items: end;
		gap: clamp(2rem, 7vw, 7rem);
	}

	.section-heading h2,
	.feature-copy h2,
	.privacy-copy h2,
	.closing-cta h2 {
		margin: 0.75rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(3.4rem, 8vw, 7.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.055em;
		line-height: 0.88;
	}

	.section-heading h2 span {
		font-family: var(--font-editorial);
		font-style: italic;
		font-weight: var(--font-weight-light);
	}

	.section-heading > p,
	.section-heading--split > p,
	.feature-copy > p:not(.section-label),
	.privacy-copy > p:not(.section-label),
	.closing-cta__inner > p:not(.section-label) {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-body);
		line-height: var(--leading-body);
	}

	.demo-frame,
	.dashboard-frame {
		position: relative;
		isolation: isolate;
	}

	.demo-frame::before,
	.dashboard-frame::before {
		position: absolute;
		inset: -0.75rem;
		z-index: -1;
		border-radius: calc(var(--radius-image) + 0.5rem);
		background: var(--color-echo-green);
		content: '';
		transform: rotate(-0.6deg);
	}

	.dashboard-section {
		max-width: none;
		width: 100%;
		background: color-mix(in srgb, var(--color-echo-green) 36%, var(--surface-canvas));
	}

	.dashboard-section > :global(*) {
		width: min(100%, var(--page-max-width));
		margin-inline: auto;
	}

	.section-heading--center {
		max-width: 68rem;
		margin-right: auto;
		margin-left: auto;
		text-align: center;
	}

	.section-heading--center > p:last-child {
		max-width: 46rem;
		margin: 1.5rem auto 0;
	}

	.search-section,
	.reminder-section,
	.portability-section,
	.privacy-section {
		padding: clamp(5rem, 11vw, 10rem) var(--page-gutter);
	}

	.search-section__inner,
	.reminder-section__inner,
	.portability-section__inner,
	.privacy-section__inner {
		display: grid;
		width: min(100%, var(--page-max-width));
		grid-template-columns: minmax(0, 0.8fr) minmax(28rem, 1.2fr);
		align-items: center;
		gap: clamp(3rem, 8vw, 8rem);
		margin: 0 auto;
	}

	.feature-copy h2,
	.privacy-copy h2 {
		font-size: clamp(3rem, 6vw, 6rem);
	}

	.feature-copy > p:not(.section-label),
	.privacy-copy > p:not(.section-label) {
		margin-top: 1.5rem;
	}

	.feature-list,
	.privacy-copy ul {
		display: grid;
		gap: 0;
		margin: 2rem 0 0;
		padding: 0;
		list-style: none;
	}

	.feature-list li,
	.privacy-copy li {
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: 1rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem 0;
	}

	.feature-list span,
	.privacy-copy li > span {
		color: var(--text-muted);
		font-family: var(--font-times);
	}

	.reminder-section {
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.reminder-section__inner {
		grid-template-columns: minmax(28rem, 1.2fr) minmax(0, 0.8fr);
	}

	.reminder-board {
		border: var(--border-hairline) solid var(--color-muted-sage);
		border-radius: var(--radius-image);
		background: var(--surface-canvas);
		color: var(--text-primary);
		overflow: hidden;
	}

	.reminder-board > header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 1.5rem;
	}

	.reminder-board h3 {
		margin: 0.3rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	.reminder-board > header > span,
	.reminder-board > footer,
	.reminder-day > p {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.reminder-day {
		display: grid;
		grid-template-columns: 5rem 1fr;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem 1.5rem;
	}

	.reminder-day > p {
		margin: 0.75rem 0 0;
		font-family: var(--font-times);
	}

	.reminder-day label,
	.reminder-row {
		display: grid;
		min-height: 4.5rem;
		grid-template-columns: 1.5rem 3.5rem minmax(0, 1fr);
		align-items: center;
		gap: 0.75rem;
		border-radius: var(--radius-control);
		padding: 0.5rem;
	}

	.reminder-day label:hover {
		background: color-mix(in srgb, var(--surface-accent) 8%, var(--surface-canvas));
	}

	.reminder-day label input {
		position: absolute;
		opacity: 0;
	}

	.reminder-day label:has(input:focus-visible) {
		outline: 3px solid var(--focus-ring);
		outline-offset: 3px;
	}

	.reminder-check {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: 0.25rem;
		color: transparent;
	}

	.reminder-day label.done .reminder-check {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.reminder-day label.done .reminder-copy {
		opacity: 0.55;
		text-decoration: line-through;
	}

	.reminder-time {
		font-family: var(--font-times);
	}

	.reminder-copy {
		display: grid;
		gap: 0.2rem;
	}

	.reminder-copy strong {
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.reminder-copy small {
		color: var(--text-muted);
	}

	.reminder-board > footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.5rem;
	}

	.feature-copy--light .section-label,
	.privacy-copy .section-label {
		color: var(--color-muted-sage);
	}

	.feature-copy--light > p:not(.section-label),
	.privacy-copy > p:not(.section-label) {
		color: var(--color-muted-sage);
		font-weight: var(--font-weight-extralight);
	}

	.feature-stat {
		display: grid;
		gap: 0.35rem;
		border-top: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 35%, transparent);
		margin-top: 2rem;
		padding-top: 1.25rem;
	}

	.feature-stat strong {
		color: var(--surface-accent);
		font-family: var(--font-times);
		font-size: 1.25rem;
		font-weight: var(--font-weight-regular);
	}

	.feature-stat span {
		color: var(--color-muted-sage);
		font-size: var(--text-body-small);
	}

	.portability-section__inner {
		grid-template-columns: minmax(0, 0.75fr) minmax(32rem, 1.25fr);
	}

	.portability-actions {
		justify-content: flex-start;
		margin-top: 2rem;
	}

	.data-pipeline {
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		overflow: hidden;
	}

	.data-pipeline__header,
	.data-pipeline > footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.data-pipeline__header {
		border-bottom: var(--border-hairline) solid var(--border-subtle);
	}

	.data-pipeline__flow {
		display: grid;
		min-height: 22rem;
		grid-template-columns: 1fr 0.55fr 1.2fr 0.55fr 1fr;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem;
	}

	.data-pipeline__flow > svg {
		width: 100%;
		color: var(--color-newsprint-gray);
	}

	.file-stack {
		position: relative;
		height: 9rem;
	}

	.file-stack span {
		position: absolute;
		display: grid;
		width: 5.5rem;
		height: 7rem;
		place-items: end start;
		border: var(--border-hairline) solid var(--border-default);
		background: var(--surface-canvas);
		padding: 0.65rem;
		font-family: var(--font-times);
	}

	.file-stack span:nth-child(1) {
		left: 0;
		transform: rotate(-7deg);
	}
	.file-stack span:nth-child(2) {
		left: 1.1rem;
		transform: rotate(3deg);
	}
	.file-stack span:nth-child(3) {
		left: 2.1rem;
		transform: rotate(8deg);
	}
	.file-stack span:nth-child(4) {
		left: 3rem;
		border-color: var(--surface-accent);
		transform: rotate(13deg);
	}

	.pipeline-library,
	.export-box {
		display: grid;
		gap: 0.4rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 1rem;
	}

	.pipeline-library {
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.pipeline-library strong,
	.export-box strong {
		font-family: var(--font-display);
		font-size: 1.65rem;
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
	}

	.pipeline-library small,
	.export-box small {
		color: var(--color-muted-sage);
	}

	.pipeline-library > div {
		display: grid;
		gap: 0.3rem;
		margin-top: 0.75rem;
	}

	.pipeline-library > div span {
		height: 0.35rem;
		background: color-mix(in srgb, var(--color-muted-sage) 35%, transparent);
	}

	.pipeline-library > div span:nth-child(2) {
		width: 74%;
	}
	.pipeline-library > div span:nth-child(3) {
		width: 46%;
		background: var(--surface-accent);
	}

	.export-box {
		border-color: var(--surface-accent);
		background: color-mix(in srgb, var(--surface-accent) 10%, var(--surface-canvas));
	}

	.export-box > span {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
	}

	.export-box small {
		color: var(--text-muted);
	}

	.data-pipeline > footer {
		border-top: var(--border-hairline) solid var(--border-subtle);
		color: var(--text-muted);
	}

	.privacy-section {
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.privacy-copy li {
		border-color: color-mix(in srgb, var(--color-muted-sage) 30%, transparent);
	}

	.privacy-copy li > div {
		display: grid;
		gap: 0.25rem;
	}

	.privacy-copy li strong {
		font-weight: var(--font-weight-medium);
	}

	.privacy-copy li small {
		color: var(--color-muted-sage);
	}

	.terminal {
		border: var(--border-hairline) solid var(--color-muted-sage);
		border-radius: var(--radius-image);
		background: var(--color-slate-verdant);
		overflow: hidden;
	}

	.terminal > header {
		display: flex;
		min-height: 3.5rem;
		align-items: center;
		gap: 0.4rem;
		border-bottom: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 30%, transparent);
		padding: 0.75rem 1rem;
	}

	.terminal > header span {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: var(--radius-full);
		background: var(--color-muted-sage);
	}

	.terminal > header span:first-child {
		background: var(--surface-accent);
	}

	.terminal > header strong {
		margin-left: auto;
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.terminal__body {
		display: grid;
		gap: 1rem;
		padding: clamp(1.25rem, 5vw, 3rem);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: var(--text-body-small);
	}

	.terminal__body p {
		margin: 0;
	}

	.terminal__body p span,
	.terminal__success,
	.terminal__body footer strong {
		color: var(--surface-accent);
	}

	.terminal__meter {
		height: 0.35rem;
		background: color-mix(in srgb, var(--color-muted-sage) 20%, transparent);
	}

	.terminal__meter span {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--surface-accent);
	}

	.terminal__body footer {
		display: grid;
		grid-template-columns: auto 1fr auto 1fr;
		gap: 0.75rem;
		border-top: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 30%, transparent);
		padding-top: 1rem;
		color: var(--color-muted-sage);
	}

	.formats-section .section-heading h2 {
		font-size: clamp(3rem, 7vw, 6.5rem);
	}

	.format-list {
		border-top: var(--border-hairline) solid var(--border-default);
	}

	.format-list article {
		display: grid;
		min-height: 6rem;
		grid-template-columns: 4rem minmax(12rem, 0.6fr) minmax(16rem, 1fr) auto;
		align-items: center;
		gap: 1.5rem;
		border-bottom: var(--border-hairline) solid var(--border-default);
		padding: 1rem 0;
		transition:
			background-color var(--motion-fast) var(--ease-out),
			padding var(--motion-fast) var(--ease-out);
	}

	.format-list article:hover {
		background: color-mix(in srgb, var(--surface-accent) 8%, var(--surface-canvas));
		padding-inline: 1rem;
	}

	.format-list article > span {
		color: var(--text-muted);
		font-family: var(--font-times);
	}

	.format-list h3 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 4vw, 3rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
	}

	.format-list p {
		margin: 0;
		color: var(--text-muted);
	}

	.format-list strong {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-align: right;
		text-transform: uppercase;
	}

	.closing-cta {
		padding: clamp(5rem, 12vw, 12rem) var(--page-gutter);
		text-align: center;
	}

	.closing-cta__inner {
		display: grid;
		max-width: 70rem;
		justify-items: center;
		gap: 1.5rem;
		margin: 0 auto;
	}

	.closing-cta h2 {
		font-size: clamp(4rem, 11vw, 11rem);
		line-height: 0.82;
	}

	.closing-cta__inner > p:not(.section-label) {
		max-width: 38rem;
	}

	.closing-cta__inner > div {
		justify-content: center;
	}

	@keyframes hero-in {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 64rem) {
		.hero h1 {
			font-size: clamp(4.2rem, 15vw, 9rem);
		}

		.search-section__inner,
		.reminder-section__inner,
		.portability-section__inner,
		.privacy-section__inner {
			grid-template-columns: 1fr;
		}

		.reminder-section__inner > :first-child {
			order: 2;
		}

		.portability-section__inner > :first-child {
			order: 1;
		}

		.data-pipeline {
			order: 2;
		}
	}

	@media (max-width: 48rem) {
		.hero {
			min-height: auto;
		}

		.hero h1 {
			font-size: clamp(4rem, 18vw, 7rem);
			line-height: 0.82;
		}

		.hero__bottom,
		.section-heading--split {
			grid-template-columns: 1fr;
		}

		.hero__actions {
			justify-content: flex-start;
		}

		.hero__facts {
			grid-template-columns: 1fr;
		}

		.hero__facts div {
			justify-content: space-between;
			border-bottom: var(--border-hairline) solid var(--border-subtle);
			padding-bottom: 0.75rem;
		}

		.hero__facts span {
			max-width: none;
			text-align: right;
		}

		.reminder-section__inner,
		.search-section__inner,
		.portability-section__inner,
		.privacy-section__inner {
			gap: 3rem;
		}

		.reminder-day {
			grid-template-columns: 1fr;
		}

		.reminder-day > p {
			margin: 0 0 0.35rem;
		}

		.data-pipeline__flow {
			grid-template-columns: 1fr;
			padding: 1.5rem;
		}

		.data-pipeline__flow > svg {
			width: 4rem;
			justify-self: center;
			transform: rotate(90deg);
		}

		.file-stack {
			width: 9rem;
			justify-self: center;
		}

		.data-pipeline > footer {
			align-items: flex-start;
			flex-direction: column;
		}

		.format-list article {
			grid-template-columns: 2.5rem 1fr auto;
			gap: 0.75rem;
		}

		.format-list article p {
			display: none;
		}
	}

	@media (max-width: 34rem) {
		.hero__topline p:last-child {
			display: none;
		}

		.hero h1 {
			font-size: clamp(3.5rem, 18vw, 5.25rem);
		}

		.hero-art {
			width: 5rem;
		}

		.hero__line--with-art {
			justify-content: flex-start;
		}

		.hero__intro {
			font-size: var(--text-body-compact);
		}

		.hero__actions,
		.portability-actions,
		.closing-cta__inner > div {
			align-items: stretch;
			flex-direction: column;
		}

		.primary-link,
		.text-link {
			justify-content: center;
		}

		.reminder-board > header,
		.reminder-board > footer {
			align-items: flex-start;
			flex-direction: column;
		}

		.reminder-day label,
		.reminder-row {
			grid-template-columns: 1.5rem 1fr;
		}

		.reminder-time {
			display: none;
		}

		.terminal__body footer {
			grid-template-columns: auto 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero__topline,
		.hero__line,
		.hero__bottom,
		.hero__facts {
			animation: none;
		}

		.primary-link:hover {
			transform: none;
		}
	}
</style>
