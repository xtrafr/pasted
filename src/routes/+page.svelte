<script lang="ts">
	import { resolve } from '$app/paths';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';

	const githubUrl = 'https://github.com/xtrafr/pasted';
	const selfHostingUrl = 'https://github.com/xtrafr/pasted/blob/main/docs/self-hosting.md';
</script>

<svelte:head>
	<title>Pasted | Your private link library</title>
	<meta
		name="description"
		content="Save links, notes, and reminders in a private, portable library you can self-host."
	/>
	<meta property="og:title" content="Pasted | Your private link library" />
	<meta
		property="og:description"
		content="A focused, portable home for links, notes, and reminders."
	/>
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>

<div class="landing-shell">
	<header class="site-header">
		<nav aria-label="Primary navigation">
			<PastedWordmark href="/" size="medium" aria-label="Pasted home" />
			<div class="nav-actions">
				<a class="nav-link" href="#self-host">Self-host</a>
				<a class="nav-link" href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
				<a class="nav-login" href={resolve('/login')}>Log in</a>
				<a class="nav-register" href={resolve('/register')}>Create account</a>
			</div>
		</nav>
	</header>

	<main id="main-content">
		<section class="hero" aria-labelledby="hero-title">
			<div class="hero-copy">
				<p class="eyebrow">Private link library</p>
				<h1 id="hero-title">Keep the useful things.<br /><em>Find them again.</em></h1>
				<p class="hero-intro">
					Pasted gives links, notes, collections, and reminders one focused home. Import what you
					already have, search it quickly, and export it whenever you want.
				</p>
				<div class="hero-actions">
					<a class="primary-action" href={resolve('/register')}>Create your library</a>
					<a class="secondary-action" href={resolve('/login')}>Log in with your code</a>
				</div>
				<p class="access-note">
					<span aria-hidden="true"></span>
					Your private 32-character access code is the only key to your library.
				</p>
			</div>

			<aside class="library-card" aria-label="What you can organize in Pasted">
				<header>
					<div>
						<span class="status-dot" aria-hidden="true"></span>
						<p>Your library</p>
					</div>
					<span class="item-count">3 item types</span>
				</header>
				<div class="search-preview" aria-hidden="true">
					<svg viewBox="0 0 24 24">
						<circle cx="11" cy="11" r="6.5"></circle>
						<path d="m16 16 4 4"></path>
					</svg>
					<span>Search everything</span>
					<kbd>/</kbd>
				</div>
				<ul>
					<li>
						<span class="item-icon">L</span>
						<div><strong>Links</strong><small>Saved with titles, notes, and tags</small></div>
						<span class="item-meta">Save</span>
					</li>
					<li>
						<span class="item-icon">N</span>
						<div><strong>Notes</strong><small>Plain text or simple Markdown</small></div>
						<span class="item-meta">Write</span>
					</li>
					<li>
						<span class="item-icon">R</span>
						<div><strong>Reminders</strong><small>Bring useful things back on time</small></div>
						<span class="item-meta">Return</span>
					</li>
				</ul>
				<footer>
					<span>Private by default</span>
					<span>Portable by design</span>
				</footer>
			</aside>
		</section>

		<section class="principles" aria-labelledby="principles-title">
			<div class="section-heading">
				<p class="eyebrow">The essentials</p>
				<h2 id="principles-title">The tool stays out of the way.</h2>
			</div>
			<div class="principle-grid">
				<article>
					<span>01</span>
					<h3>Private account</h3>
					<p>Your library is account-scoped and private unless you deliberately create a share.</p>
				</article>
				<article>
					<span>02</span>
					<h3>Portable data</h3>
					<p>Import bookmarks and common file formats, then export clean files or a full backup.</p>
				</article>
				<article>
					<span>03</span>
					<h3>Your own server</h3>
					<p>Run the same app with Docker and PostgreSQL on infrastructure you control.</p>
				</article>
			</div>
		</section>

		<section class="self-host" id="self-host" aria-labelledby="self-host-title">
			<div class="self-host-copy">
				<p class="eyebrow">Open source and self-hostable</p>
				<h2 id="self-host-title">Your server.<br />Your database.<br />Your archive.</h2>
				<p>
					Pasted ships with a Docker Compose setup for the app, worker, and PostgreSQL. Read the
					setup guide, inspect the code, and deploy it where it makes sense for you.
				</p>
				<a class="github-action" href={selfHostingUrl} target="_blank" rel="noreferrer">
					Read the setup guide
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
				</a>
			</div>
			<div class="terminal" aria-label="Abbreviated self-hosting overview">
				<header>
					<div aria-hidden="true"><span></span><span></span><span></span></div>
					<strong>pasted / setup</strong>
				</header>
				<div class="terminal-body">
					<p><span>$</span> git clone https://github.com/xtrafr/pasted.git</p>
					<p><span>$</span> cd pasted</p>
					<p><span>$</span> cp .env.example .env</p>
					<p><span>$</span> your-editor .env</p>
					<p><span>$</span> docker compose up -d --build</p>
					<div class="ready">
						<span aria-hidden="true"></span>Configure the three required values first
					</div>
				</div>
				<footer>
					<span>App</span><strong>Node</strong><span>Data</span><strong>PostgreSQL</strong>
				</footer>
			</div>
		</section>

		<section class="closing" aria-labelledby="closing-title">
			<p class="eyebrow">Start with one useful thing</p>
			<h2 id="closing-title">Make your library yours.</h2>
			<div>
				<a class="primary-action" href={resolve('/register')}>Create account</a>
				<a class="secondary-action" href={resolve('/login')}>Log in</a>
			</div>
		</section>
	</main>

	<footer class="site-footer">
		<PastedWordmark href="/" tone="dark" size="small" aria-label="Pasted home" />
		<p>Private by default. Portable by design.</p>
		<a href={githubUrl} target="_blank" rel="noreferrer">Source on GitHub</a>
	</footer>
</div>

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

	.landing-shell {
		min-height: 100vh;
		background:
			radial-gradient(circle at 80% 10%, rgb(43 238 75 / 8%), transparent 25rem),
			var(--surface-canvas);
	}

	.site-header {
		border-bottom: var(--border-hairline) solid var(--border-subtle);
	}

	nav {
		display: flex;
		width: min(100%, var(--page-max-width));
		min-height: 4.75rem;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		margin: 0 auto;
		padding: 0 var(--page-gutter);
	}

	.nav-actions,
	.hero-actions,
	.closing > div {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.nav-link,
	.nav-login,
	.nav-register,
	.primary-action,
	.secondary-action,
	.github-action {
		border-radius: var(--radius-button);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.nav-link,
	.nav-login {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		text-decoration: none;
	}

	.nav-link:hover,
	.nav-login:hover {
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}

	.nav-register,
	.primary-action {
		display: inline-flex;
		min-height: 3rem;
		align-items: center;
		justify-content: center;
		background: var(--surface-accent);
		box-shadow: var(--shadow-green);
		color: var(--color-typesetter-ink);
		padding: 0.85rem 1.2rem;
		text-decoration: none;
		transition:
			transform var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-standard) var(--ease-out);
	}

	.nav-register:hover,
	.primary-action:hover {
		box-shadow: var(--shadow-green-soft);
		transform: translateY(-1px);
	}

	.hero,
	.principles,
	.self-host,
	.closing,
	.site-footer {
		width: min(100%, var(--page-max-width));
		margin: 0 auto;
		padding-inline: var(--page-gutter);
	}

	.hero {
		display: grid;
		min-height: min(48rem, calc(100svh - 4.75rem));
		grid-template-columns: minmax(0, 1.05fr) minmax(24rem, 0.75fr);
		align-items: center;
		gap: clamp(3rem, 9vw, 9rem);
		padding-top: clamp(4rem, 9vw, 8rem);
		padding-bottom: clamp(4rem, 9vw, 8rem);
	}

	.hero-copy {
		display: grid;
		justify-items: start;
	}

	.eyebrow {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	h1 {
		max-width: 11ch;
		margin: 1.5rem 0 2rem;
		font-family: var(--font-display);
		font-size: clamp(4rem, 8.5vw, 8.5rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.06em;
		line-height: 0.84;
	}

	h1 em {
		font-family: var(--font-editorial);
		font-weight: var(--font-weight-light);
	}

	.hero-intro {
		max-width: 42rem;
		margin-bottom: 2rem;
		color: var(--text-muted);
		font-size: var(--text-body);
		line-height: var(--leading-body);
	}

	.secondary-action {
		display: inline-flex;
		min-height: 3rem;
		align-items: center;
		justify-content: center;
		border: var(--border-hairline) solid var(--border-default);
		padding: 0.85rem 1.2rem;
		text-decoration: none;
		transition:
			background-color var(--motion-fast) var(--ease-out),
			color var(--motion-fast) var(--ease-out);
	}

	.secondary-action:hover {
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.access-note {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin: 1.5rem 0 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.access-note > span {
		width: 0.55rem;
		height: 0.55rem;
		flex: 0 0 auto;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		box-shadow: 0 0 0 4px rgb(43 238 75 / 15%);
	}

	.library-card {
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-raised);
		box-shadow: 1.25rem 1.25rem 0 var(--color-echo-green);
		overflow: hidden;
		transform: rotate(0.7deg);
	}

	.library-card > header,
	.library-card > footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
	}

	.library-card > header {
		border-bottom: var(--border-hairline) solid var(--border-subtle);
	}

	.library-card > header > div {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.library-card > header p,
	.library-card > footer,
	.item-count,
	.item-meta {
		margin: 0;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.status-dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
	}

	.item-count,
	.item-meta,
	.library-card > footer {
		color: var(--text-muted);
	}

	.search-preview {
		display: grid;
		min-height: 3rem;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		margin: 1.25rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 0.7rem 0.85rem;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.search-preview svg {
		width: 1.1rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 1.6;
	}

	.search-preview kbd {
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: 0.25rem;
		padding: 0.12rem 0.38rem;
		font: inherit;
	}

	.library-card ul {
		margin: 0;
		padding: 0 1.25rem;
		list-style: none;
	}

	.library-card li {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.85rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding: 1rem 0;
	}

	.item-icon {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		place-items: center;
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--surface-accent) 18%, var(--surface-canvas));
		font-family: var(--font-times);
		font-size: 1.1rem;
	}

	.library-card li div {
		display: grid;
		gap: 0.15rem;
	}

	.library-card li strong {
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.library-card li small {
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	.library-card > footer {
		border-top: var(--border-hairline) solid var(--border-subtle);
	}

	.principles {
		padding-top: clamp(4rem, 9vw, 8rem);
		padding-bottom: clamp(4rem, 9vw, 8rem);
		border-top: var(--border-hairline) solid var(--border-default);
	}

	.section-heading {
		display: grid;
		grid-template-columns: 1fr 2fr;
		align-items: end;
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.section-heading h2,
	.self-host h2,
	.closing h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(3rem, 6.5vw, 6rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.05em;
		line-height: 0.9;
	}

	.principle-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border-top: var(--border-hairline) solid var(--border-default);
	}

	.principle-grid article {
		min-height: 17rem;
		border-right: var(--border-hairline) solid var(--border-default);
		padding: 1.5rem;
	}

	.principle-grid article:last-child {
		border-right: 0;
	}

	.principle-grid article > span {
		color: var(--text-muted);
		font-family: var(--font-times);
	}

	.principle-grid h3 {
		margin: 4rem 0 1rem;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	.principle-grid p {
		max-width: 34ch;
		margin-bottom: 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.self-host {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(28rem, 1.15fr);
		align-items: center;
		gap: clamp(3rem, 8vw, 8rem);
		max-width: none;
		padding-top: clamp(5rem, 10vw, 9rem);
		padding-bottom: clamp(5rem, 10vw, 9rem);
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.self-host-copy {
		width: min(100%, 39rem);
		justify-self: end;
	}

	.self-host .eyebrow {
		color: var(--color-muted-sage);
	}

	.self-host h2 {
		margin: 1rem 0 1.5rem;
	}

	.self-host-copy > p:not(.eyebrow) {
		color: var(--color-muted-sage);
		font-size: var(--text-body);
		line-height: var(--leading-body);
	}

	.github-action {
		display: inline-flex;
		min-height: 3rem;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1rem;
		border: var(--border-hairline) solid var(--border-inverse);
		padding: 0.85rem 1.1rem;
		text-decoration: none;
	}

	.github-action:hover {
		background: var(--surface-accent);
		border-color: var(--surface-accent);
		color: var(--color-typesetter-ink);
	}

	.github-action svg {
		width: 1.15rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.terminal {
		width: min(100%, 48rem);
		border: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 40%, transparent);
		border-radius: var(--radius-image);
		background: #191f1a;
		overflow: hidden;
	}

	.terminal > header,
	.terminal > footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
	}

	.terminal > header {
		border-bottom: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 25%, transparent);
	}

	.terminal > header > div {
		display: flex;
		gap: 0.4rem;
	}

	.terminal > header span {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: var(--radius-full);
		background: var(--color-muted-sage);
		opacity: 0.45;
	}

	.terminal > header span:first-child {
		background: var(--surface-accent);
		opacity: 1;
	}

	.terminal > header strong,
	.terminal > footer {
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.terminal-body {
		display: grid;
		gap: 1.25rem;
		padding: clamp(1.5rem, 5vw, 3rem);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: var(--text-body-small);
	}

	.terminal-body p {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.terminal-body p span,
	.ready,
	.terminal > footer strong {
		color: var(--surface-accent);
	}

	.ready {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		border-top: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 25%, transparent);
		margin-top: 0.5rem;
		padding-top: 1.5rem;
	}

	.ready span {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		box-shadow: 0 0 0 4px rgb(43 238 75 / 12%);
	}

	.terminal > footer {
		justify-content: flex-start;
		border-top: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 25%, transparent);
	}

	.terminal > footer strong {
		margin-right: 1rem;
	}

	.closing {
		display: grid;
		justify-items: center;
		gap: 1.5rem;
		padding-top: clamp(5rem, 10vw, 9rem);
		padding-bottom: clamp(5rem, 10vw, 9rem);
		text-align: center;
	}

	.closing h2 {
		max-width: 12ch;
	}

	.site-footer {
		display: grid;
		max-width: none;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
		background: var(--surface-dark);
		color: var(--text-inverse);
		padding-top: 1.5rem;
		padding-bottom: 1.5rem;
		font-size: var(--text-body-small);
	}

	.site-footer p {
		margin: 0;
		color: var(--color-muted-sage);
		text-align: center;
	}

	.site-footer > a {
		justify-self: end;
		text-underline-offset: 0.25em;
	}

	@media (max-width: 64rem) {
		.hero {
			grid-template-columns: 1fr;
		}

		.library-card {
			width: min(100%, 38rem);
		}

		.self-host {
			grid-template-columns: 1fr;
		}

		.self-host-copy {
			width: min(100%, var(--page-max-width));
			justify-self: center;
		}

		.terminal {
			width: min(100%, var(--page-max-width));
			justify-self: center;
		}
	}

	@media (max-width: 48rem) {
		.nav-link {
			display: none;
		}

		.section-heading {
			grid-template-columns: 1fr;
		}

		.principle-grid {
			grid-template-columns: 1fr;
		}

		.principle-grid article {
			min-height: auto;
			border-right: 0;
			border-bottom: var(--border-hairline) solid var(--border-default);
			padding: 1.5rem 0;
		}

		.principle-grid h3 {
			margin-top: 2rem;
		}

		.site-footer {
			grid-template-columns: 1fr auto;
		}

		.site-footer p {
			display: none;
		}
	}

	@media (max-width: 34rem) {
		nav {
			min-height: 4.25rem;
		}

		.nav-login {
			display: none;
		}

		.nav-register {
			min-height: 2.75rem;
			padding-inline: 0.8rem;
		}

		h1 {
			font-size: clamp(3.6rem, 17vw, 5rem);
		}

		.hero-actions,
		.closing > div {
			width: 100%;
			align-items: stretch;
			flex-direction: column;
		}

		.primary-action,
		.secondary-action {
			width: 100%;
		}

		.library-card {
			box-shadow: 0.75rem 0.75rem 0 var(--color-echo-green);
		}

		.item-meta {
			display: none;
		}

		.library-card li {
			grid-template-columns: auto 1fr;
		}

		.library-card > footer {
			align-items: flex-start;
			flex-direction: column;
		}

		.terminal > footer {
			flex-wrap: wrap;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-register:hover,
		.primary-action:hover {
			transform: none;
		}
	}
</style>
