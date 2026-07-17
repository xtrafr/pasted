<script lang="ts">
	import { resolve } from '$app/paths';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';
</script>

<header class="site-header">
	<nav aria-label="Primary navigation">
		<PastedWordmark href="/" size="medium" aria-label="Pasted home" />
		<div class="nav-links">
			<a href="#demo">How it works</a>
			<a href="#features">Features</a>
			<a href="#privacy">Privacy</a>
		</div>
		<div class="nav-actions">
			<a class="sign-in" href={resolve('/login')}>Sign in</a>
			<a class="start" href={resolve('/register')}>Start free</a>
		</div>
	</nav>
</header>

<style>
	.site-header {
		position: relative;
		z-index: 20;
		border-bottom: var(--border-hairline) solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-canvas) 92%, transparent);
		backdrop-filter: blur(12px);
	}

	nav {
		display: grid;
		width: min(100%, var(--page-max-width));
		min-height: 5rem;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1.5rem;
		margin: 0 auto;
		padding: 0 var(--page-gutter);
	}

	.nav-links,
	.nav-actions {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-links {
		justify-content: center;
	}

	.nav-actions {
		justify-content: flex-end;
	}

	a {
		border-radius: var(--radius-button);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
		text-transform: uppercase;
	}

	.nav-links a,
	.sign-in {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		text-decoration: none;
	}

	.nav-links a:hover,
	.sign-in:hover {
		text-decoration: underline;
	}

	.start {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		justify-content: center;
		background: var(--surface-accent);
		box-shadow: var(--shadow-green);
		color: var(--color-typesetter-ink);
		padding: 0.75rem 1rem;
		text-decoration: none;
		transition:
			transform var(--motion-fast) var(--ease-out),
			box-shadow var(--motion-standard) var(--ease-out);
	}

	.start:hover {
		box-shadow: var(--shadow-green-soft);
		transform: translateY(-1px);
	}

	@media (max-width: 52rem) {
		nav {
			grid-template-columns: 1fr auto;
		}

		.nav-links {
			display: none;
		}
	}

	@media (max-width: 34rem) {
		nav {
			min-height: 4.5rem;
			gap: 0.75rem;
		}

		.sign-in {
			display: none;
		}

		.start {
			padding-inline: 0.75rem;
		}
	}
</style>
