<script lang="ts">
	import { resolve } from '$app/paths';
	import PastedWordmark from '$lib/components/brand/PastedWordmark.svelte';
</script>

<footer>
	<div class="footer-main">
		<div class="footer-main__inner">
			<div class="footer-brand">
				<PastedWordmark href="/" tone="dark" size="large" aria-label="Pasted home" />
				<p>A private, searchable home for the useful parts of your digital life.</p>
				<a href="mailto:hello@pasted.local">hello@pasted.local</a>
			</div>
			<div class="footer-links">
				<div>
					<h2>Product</h2>
					<a href="#demo">How it works</a>
					<a href="#features">Features</a>
					<a href="#formats">Formats</a>
				</div>
				<div>
					<h2>Principles</h2>
					<a href="#privacy">Privacy</a>
					<a href="#self-hosting">Self-hosting</a>
					<a href="#import-export">Portable data</a>
				</div>
				<div>
					<h2>Account</h2>
					<a href={resolve('/login')}>Sign in</a>
					<a href={resolve('/register')}>Create account</a>
				</div>
			</div>
		</div>
		<div class="footer-legal">
			<span>© {new Date().getFullYear()} Pasted</span>
			<span>Built for remembering, not tracking.</span>
		</div>
	</div>
	<div class="signature" aria-hidden="true">
		<span class="signature__mark">P</span>
		<span class="signature__word">PASTED</span>
	</div>
</footer>

<style>
	.footer-main {
		background: var(--surface-dark);
		color: var(--text-inverse);
	}

	.footer-main__inner {
		display: grid;
		width: min(100%, var(--page-max-width));
		grid-template-columns: minmax(16rem, 1fr) 1.5fr;
		gap: clamp(3rem, 10vw, 10rem);
		margin: 0 auto;
		padding: clamp(4rem, 8vw, 8rem) var(--page-gutter);
	}

	.footer-brand {
		display: grid;
		align-content: start;
		justify-items: start;
		gap: 1.25rem;
	}

	.footer-brand p {
		max-width: 30ch;
		margin: 0;
		color: var(--color-muted-sage);
		font-size: var(--text-body);
		font-weight: var(--font-weight-extralight);
		line-height: var(--leading-body);
	}

	.footer-brand > a {
		min-height: 2.75rem;
		align-content: center;
		font-family: var(--font-times);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}

	.footer-links {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2rem;
	}

	.footer-links > div {
		display: grid;
		align-content: start;
		gap: 0.4rem;
	}

	.footer-links h2 {
		margin: 0 0 1rem;
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.footer-links a {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		justify-self: start;
		font-size: var(--text-body-small);
		text-decoration: none;
	}

	.footer-links a:hover {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}

	.footer-legal {
		display: flex;
		width: min(100%, var(--page-max-width));
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 auto;
		border-top: var(--border-hairline) solid
			color-mix(in srgb, var(--color-muted-sage) 25%, transparent);
		padding: 1.25rem var(--page-gutter);
		color: var(--color-muted-sage);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.signature {
		position: relative;
		height: var(--accent-band-height);
		background: var(--surface-accent);
		color: var(--color-bone-white);
		overflow: hidden;
	}

	.signature__mark {
		position: absolute;
		top: var(--page-gutter);
		left: var(--page-gutter);
		font-family: var(--font-display);
		font-size: clamp(5rem, 12vw, 12rem);
		letter-spacing: -0.08em;
		line-height: 0.75;
	}

	.signature__word {
		position: absolute;
		right: -0.04em;
		bottom: -0.18em;
		left: -0.04em;
		font-family: var(--font-display);
		font-size: clamp(7rem, 24vw, 24rem);
		letter-spacing: -0.08em;
		line-height: 0.8;
		text-align: center;
		white-space: nowrap;
	}

	@media (max-width: 48rem) {
		.footer-main__inner {
			grid-template-columns: 1fr;
		}

		.footer-links {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.footer-legal {
			align-items: flex-start;
			flex-direction: column;
		}
	}

	@media (max-width: 30rem) {
		.footer-links {
			grid-template-columns: 1fr;
		}
	}
</style>
