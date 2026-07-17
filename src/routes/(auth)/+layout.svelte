<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="auth-shell">
	<header class="auth-nav">
		<PastedWordmark href="/" size="medium" aria-label="Pasted home" />
		<a href={resolve('/')}>Back to home</a>
	</header>

	<main>
		<aside class="auth-context" aria-label="About Pasted access">
			<div>
				<p class="eyebrow">One key. Your library.</p>
				<h2>Access with one private code.</h2>
				<p class="context-copy">
					Pasted gives you one private 32-character code. It is the only credential tied to your
					account, so you stay in control of where it is stored.
				</p>
			</div>
			<ul>
				<li><span>01</span><strong>No account profile to fill out</strong></li>
				<li><span>02</span><strong>Private by default</strong></li>
				<li><span>03</span><strong>Portable and self-hostable</strong></li>
			</ul>
			<p class="context-footer">Open source and ready to run on your own server.</p>
		</aside>

		<section class="auth-panel" aria-label="Account access">
			{@render children()}
		</section>
	</main>

	<footer>
		<span>Private by default</span>
		<span aria-hidden="true"></span>
		<span>Keep your access code somewhere safe</span>
	</footer>
</div>

<style>
	.auth-shell {
		display: grid;
		min-height: 100svh;
		grid-template-rows: auto 1fr auto;
		background:
			radial-gradient(circle at 15% 85%, rgb(43 238 75 / 11%), transparent 26rem),
			linear-gradient(var(--border-subtle) 1px, transparent 1px),
			linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px), var(--surface-canvas);
		background-size:
			auto,
			4rem 4rem,
			4rem 4rem,
			auto;
	}

	.auth-nav {
		display: flex;
		min-height: 4.75rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		padding: 0 var(--page-gutter);
		background: color-mix(in srgb, var(--surface-canvas) 88%, transparent);
		backdrop-filter: blur(10px);
	}

	.auth-nav > a {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-underline-offset: 0.25em;
		text-transform: uppercase;
	}

	main {
		display: grid;
		width: min(100%, 76rem);
		grid-template-columns: minmax(0, 0.9fr) minmax(25rem, 0.75fr);
		align-items: stretch;
		gap: clamp(2rem, 7vw, 7rem);
		margin: auto;
		padding: clamp(2rem, 7vw, 6rem) var(--page-gutter);
	}

	.auth-context {
		display: grid;
		align-content: space-between;
		gap: 3rem;
		padding: clamp(1rem, 3vw, 2rem) 0;
	}

	.eyebrow {
		margin: 0 0 1rem;
		color: var(--text-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.auth-context h2 {
		max-width: 11ch;
		margin: 0 0 1.5rem;
		font-family: var(--font-display);
		font-size: clamp(3.4rem, 7vw, 6.75rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.055em;
		line-height: 0.88;
	}

	.context-copy {
		max-width: 36rem;
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-body);
		line-height: var(--leading-body);
	}

	.auth-context ul {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.auth-context li {
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: 1rem;
		border-top: var(--border-hairline) solid var(--border-default);
		padding: 0.9rem 0;
	}

	.auth-context li span {
		color: var(--text-muted);
		font-family: var(--font-times);
		font-weight: var(--font-weight-regular);
	}

	.auth-context li strong {
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
	}

	.context-footer {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.auth-panel {
		width: 100%;
		align-self: center;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: var(--surface-raised);
		box-shadow: 1rem 1rem 0 var(--color-echo-green);
		padding: clamp(1.5rem, 5vw, 3.5rem);
	}

	.auth-shell > footer {
		display: flex;
		min-height: 3.75rem;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding: 0.75rem var(--page-gutter);
		color: var(--text-muted);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-align: center;
		text-transform: uppercase;
	}

	.auth-shell > footer span[aria-hidden='true'] {
		width: 0.35rem;
		height: 0.35rem;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
	}

	@media (max-width: 60rem) {
		main {
			width: min(100%, 36rem);
			grid-template-columns: 1fr;
		}

		.auth-context {
			display: none;
		}
	}

	@media (max-width: 34rem) {
		.auth-nav {
			min-height: 4.25rem;
		}

		main {
			padding-top: 1.25rem;
			padding-bottom: 2rem;
		}

		.auth-panel {
			box-shadow: 0.6rem 0.6rem 0 var(--color-echo-green);
			padding: 1.35rem;
		}

		.auth-shell > footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.25rem;
		}

		.auth-shell > footer span[aria-hidden='true'] {
			display: none;
		}
	}
</style>
