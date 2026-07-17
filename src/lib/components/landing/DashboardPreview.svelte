<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section class="dashboard" aria-label="Pasted dashboard preview">
	<header class="dashboard__header">
		<strong><span>Past</span>ed</strong>
		<div class="dashboard__search">
			<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
				<circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
				<path d="m13.5 13.5 4 4" stroke="currentColor" />
			</svg>
			<span>Search everything</span>
			<kbd>⌘ K</kbd>
		</div>
		<span class="dashboard__avatar">RP</span>
	</header>
	<div class="dashboard__body">
		<aside>
			<p>Workspace</p>
			<ul>
				<li class="selected"><span>All links</span><small>128</small></li>
				<li><span>Reminders</span><small>6</small></li>
				<li><span>Archive</span><small>41</small></li>
			</ul>
			<p>Collections</p>
			<ul>
				<li><span><i></i>Research</span><small>32</small></li>
				<li><span><i></i>Project Atlas</span><small>18</small></li>
				<li><span><i></i>Reading list</span><small>24</small></li>
				<li><span><i></i>Weekend ideas</span><small>9</small></li>
			</ul>
			<a class="new-collection" href={resolve('/register')}>+ New collection</a>
		</aside>
		<div class="dashboard__main">
			<div class="dashboard__title">
				<div>
					<p>Library</p>
					<h3>All links</h3>
				</div>
				<div class="dashboard__views" aria-hidden="true">
					<span class="active">Grid</span><span>List</span>
				</div>
			</div>
			<div class="dashboard__filters">
				<span>All</span><span>Unread</span><span>Due soon</span><span>With notes</span>
			</div>
			<div class="dashboard__grid">
				<article>
					<div class="preview-art art-one">
						<span>01</span><svg viewBox="0 0 100 70" aria-hidden="true"
							><path
								d="M10 55 35 20l18 26 15-17 22 26"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							/></svg
						>
					</div>
					<p>fieldnotes.example</p>
					<h4>A calmer way to review a busy week</h4>
					<footer><span>Read later</span><small>Today</small></footer>
				</article>
				<article>
					<div class="preview-art art-two">
						<span>02</span><svg viewBox="0 0 100 70" aria-hidden="true"
							><circle
								cx="50"
								cy="35"
								r="24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							/><path d="M50 11v48M26 35h48" stroke="currentColor" /></svg
						>
					</div>
					<p>smallweb.example</p>
					<h4>Research notes for the tiny web</h4>
					<footer><span>Research</span><small>Yesterday</small></footer>
				</article>
				<article>
					<div class="preview-art art-three">
						<span>03</span><svg viewBox="0 0 100 70" aria-hidden="true"
							><path
								d="M15 53h70M24 53V26h18v27M50 53V16h25v37"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							/></svg
						>
					</div>
					<p>workbench.example</p>
					<h4>A practical guide to local-first tools</h4>
					<footer><span>Tools</span><small>4 days</small></footer>
				</article>
				<article class="dashboard__note">
					<p>Personal note</p>
					<blockquote>“Bring this into the next planning session.”</blockquote>
					<footer><span>Project Atlas</span><small>Friday</small></footer>
				</article>
			</div>
		</div>
	</div>
</section>

<style>
	.dashboard {
		width: 100%;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-canvas);
		color: var(--text-primary);
		overflow: hidden;
	}

	.dashboard__header {
		display: grid;
		min-height: 4rem;
		grid-template-columns: 11rem minmax(12rem, 28rem) 1fr;
		align-items: center;
		gap: 1.5rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 0.65rem 1rem;
	}

	.dashboard__header > strong {
		font-size: 1.125rem;
		font-weight: var(--font-weight-medium);
		letter-spacing: -0.04em;
	}

	.dashboard__header > strong span {
		text-decoration: underline;
		text-decoration-color: var(--surface-accent);
		text-decoration-thickness: 2px;
		text-underline-offset: 0.14em;
	}

	.dashboard__search {
		display: grid;
		min-height: 2.5rem;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.625rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 0 0.75rem;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	kbd {
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: 0.25rem;
		padding: 0.15rem 0.35rem;
		font-family: var(--font-ui);
		font-size: 0.65rem;
	}

	.dashboard__avatar {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		place-items: center;
		justify-self: end;
		border-radius: var(--radius-full);
		background: var(--color-press-black);
		color: var(--text-inverse);
		font-size: 0.65rem;
	}

	.dashboard__body {
		display: grid;
		grid-template-columns: 13rem minmax(0, 1fr);
		min-height: 38rem;
	}

	aside {
		border-right: var(--border-hairline) solid var(--border-subtle);
		padding: 1.25rem 0.75rem;
	}

	aside > p,
	.dashboard__title p,
	.dashboard__grid article > p {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	aside > p:not(:first-child) {
		margin-top: 1.5rem;
	}

	aside ul {
		display: grid;
		gap: 0.2rem;
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
	}

	aside li {
		display: flex;
		min-height: 2.25rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-radius: var(--radius-button);
		padding: 0.4rem 0.5rem;
		font-size: 0.75rem;
	}

	aside li.selected {
		background: var(--surface-accent);
		font-weight: var(--font-weight-medium);
	}

	aside li span {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

	aside li i {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--radius-full);
		background: var(--color-newsprint-gray);
	}

	aside li small {
		color: var(--text-muted);
		font-size: 0.65rem;
	}

	aside .new-collection {
		display: block;
		width: 100%;
		min-height: 2.75rem;
		margin-top: 0.75rem;
		border: 0;
		border-radius: var(--radius-button);
		background: transparent;
		color: inherit;
		padding: 0.5rem;
		font-size: 0.7rem;
		text-align: left;
		text-decoration: none;
	}

	aside .new-collection:hover,
	aside .new-collection:focus-visible {
		background: color-mix(in srgb, var(--color-echo-green) 40%, transparent);
	}

	.dashboard__main {
		min-width: 0;
		padding: 1.5rem;
	}

	.dashboard__title {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.dashboard__title h3 {
		margin: 0.3rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.75rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.9;
	}

	.dashboard__views,
	.dashboard__filters {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.dashboard__views span,
	.dashboard__filters span {
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: var(--radius-button);
		padding: 0.35rem 0.55rem;
		font-size: 0.65rem;
	}

	.dashboard__views span.active,
	.dashboard__filters span:first-child {
		border-color: var(--border-default);
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	.dashboard__filters {
		margin: 1.25rem 0;
	}

	.dashboard__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.dashboard__grid article {
		display: grid;
		min-width: 0;
		gap: 0.6rem;
		border: var(--border-hairline) solid var(--border-subtle);
		border-radius: var(--radius-control);
		padding: 0.75rem;
	}

	.preview-art {
		position: relative;
		display: grid;
		aspect-ratio: 1.55;
		place-items: center;
		border-radius: var(--radius-button);
		overflow: hidden;
	}

	.preview-art > span {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		font-family: var(--font-times);
		font-size: 0.7rem;
	}

	.preview-art svg {
		width: 70%;
		height: 70%;
	}

	.art-one {
		background: var(--color-echo-green);
	}
	.art-two {
		background: var(--color-muted-sage);
	}
	.art-three {
		background: var(--surface-accent);
	}

	.dashboard__grid h4 {
		margin: 0;
		font-family: var(--font-times);
		font-size: 1rem;
		font-weight: var(--font-weight-regular);
		line-height: 1.15;
	}

	.dashboard__grid footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		margin-top: auto;
		padding-top: 0.55rem;
		color: var(--text-muted);
		font-size: 0.65rem;
	}

	.dashboard__note {
		grid-column: span 3;
		grid-template-columns: 1fr 2fr auto;
		align-items: center;
	}

	.dashboard__note blockquote {
		margin: 0;
		font-family: var(--font-editorial);
		font-size: 1.25rem;
		font-style: italic;
	}

	.dashboard__note footer {
		border: 0;
		padding: 0;
	}

	@media (max-width: 58rem) {
		.dashboard__header {
			grid-template-columns: 8rem 1fr auto;
		}

		.dashboard__body {
			grid-template-columns: 10rem 1fr;
		}

		.dashboard__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.dashboard__grid article:nth-child(3) {
			display: none;
		}

		.dashboard__note {
			grid-column: span 2;
		}
	}

	@media (max-width: 42rem) {
		.dashboard__header {
			grid-template-columns: 1fr auto;
		}

		.dashboard__search,
		aside,
		.dashboard__views,
		.dashboard__filters span:nth-child(n + 3) {
			display: none;
		}

		.dashboard__body {
			grid-template-columns: 1fr;
			min-height: auto;
		}

		.dashboard__main {
			padding: 1rem;
		}

		.dashboard__grid {
			grid-template-columns: 1fr;
		}

		.dashboard__grid article:nth-child(2) {
			display: none;
		}

		.dashboard__note {
			grid-column: auto;
			grid-template-columns: 1fr;
		}
	}
</style>
