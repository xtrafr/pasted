<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Account access | Pasted</title>
</svelte:head>

<main class="security-page">
	<header>
		<p class="eyebrow">Account security</p>
		<h1>Protect your access code.</h1>
		<p>
			Your 32-character code is the only credential for this account. Pasted never shows it again
			after registration and cannot send a recovery message.
		</p>
	</header>

	<section class="status-card" aria-labelledby="access-status-title">
		<div class="status-mark" aria-hidden="true"><span></span></div>
		<div>
			<p>Current access method</p>
			<h2 id="access-status-title">Private access code</h2>
			<p>No other credential is attached to your sign-in flow.</p>
		</div>
		<strong>Active</strong>
	</section>

	<section class="guidance" aria-labelledby="guidance-title">
		<div class="section-heading">
			<p class="eyebrow">Keep control</p>
			<h2 id="guidance-title">Three useful safeguards</h2>
		</div>
		<ol>
			<li>
				<span>01</span>
				<div>
					<h3>Store the code in an encrypted vault</h3>
					<p>
						Use a trusted credential manager or an encrypted file. Avoid leaving the code in plain
						notes, chat messages, or screenshots.
					</p>
				</div>
			</li>
			<li>
				<span>02</span>
				<div>
					<h3>Keep an account backup</h3>
					<p>
						Export your library while you are signed in. A backup protects your data, even though it
						cannot replace a lost access code.
					</p>
					<a href={resolve('/app/export')}>Open export</a>
				</div>
			</li>
			<li>
				<span>03</span>
				<div>
					<h3>Sign out on shared devices</h3>
					<p>
						Use the sign-out action in the app header when you finish on a computer other people can
						access.
					</p>
				</div>
			</li>
		</ol>
	</section>

	<aside class="recovery-note">
		<div>
			<p class="eyebrow">No recovery or rotation</p>
			<h2>If the code is lost, this account cannot be reopened.</h2>
		</div>
		<p>
			Pasted does not currently expose the code, reset it, or rotate it. If you still have an active
			session, export your library before signing out.
		</p>
	</aside>
</main>

<style>
	.security-page {
		display: grid;
		width: min(100%, 68rem);
		gap: clamp(2.5rem, 6vw, 5rem);
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 7rem) var(--page-gutter);
	}

	header {
		display: grid;
		max-width: 50rem;
		gap: 1rem;
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

	.eyebrow,
	.status-card > strong,
	.status-card > div:nth-child(2) > p:first-child {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	h1 {
		font-family: var(--font-display);
		font-size: var(--text-heading-small);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.045em;
		line-height: 0.9;
	}

	header > p:last-child {
		max-width: 44rem;
		color: var(--text-muted);
		font-size: var(--text-body);
		line-height: var(--leading-body);
	}

	.status-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1.25rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-image);
		background: color-mix(in srgb, var(--color-echo-green) 30%, var(--surface-canvas));
		padding: clamp(1.25rem, 4vw, 2rem);
	}

	.status-mark {
		display: grid;
		width: 3.25rem;
		height: 3.25rem;
		place-items: center;
		border-radius: var(--radius-full);
		background: var(--surface-dark);
	}

	.status-mark span {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		box-shadow: 0 0 0 5px rgb(43 238 75 / 16%);
	}

	.status-card > div:nth-child(2) {
		display: grid;
		gap: 0.35rem;
	}

	.status-card h2 {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.035em;
		line-height: 1;
	}

	.status-card > div:nth-child(2) > p:last-child {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	.status-card > strong {
		border-radius: var(--radius-full);
		background: var(--surface-accent);
		padding: 0.55rem 0.8rem;
	}

	.guidance {
		display: grid;
		gap: 2rem;
	}

	.section-heading {
		display: grid;
		grid-template-columns: 1fr 2fr;
		align-items: end;
		gap: 1.5rem;
	}

	.section-heading h2,
	.recovery-note h2 {
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	.guidance ol {
		margin: 0;
		padding: 0;
		border-top: var(--border-hairline) solid var(--border-default);
		list-style: none;
	}

	.guidance li {
		display: grid;
		grid-template-columns: 4rem 1fr;
		gap: 1rem;
		border-bottom: var(--border-hairline) solid var(--border-default);
		padding: 1.5rem 0;
	}

	.guidance li > span {
		color: var(--text-muted);
		font-family: var(--font-times);
	}

	.guidance li > div {
		display: grid;
		max-width: 45rem;
		gap: 0.65rem;
	}

	.guidance h3 {
		font-size: var(--text-body);
		font-weight: var(--font-weight-medium);
	}

	.guidance li p,
	.recovery-note > p {
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.guidance a {
		justify-self: start;
		font-size: var(--text-body-small);
		font-weight: var(--font-weight-medium);
		text-underline-offset: 0.25em;
	}

	.recovery-note {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(16rem, 0.9fr);
		gap: clamp(2rem, 6vw, 5rem);
		border-radius: var(--radius-image);
		background: var(--surface-dark);
		color: var(--text-inverse);
		padding: clamp(1.5rem, 5vw, 3rem);
	}

	.recovery-note > div {
		display: grid;
		gap: 0.85rem;
	}

	.recovery-note .eyebrow,
	.recovery-note > p {
		color: var(--color-muted-sage);
	}

	@media (max-width: 42rem) {
		.status-card {
			grid-template-columns: auto 1fr;
		}

		.status-card > strong {
			grid-column: 2;
			justify-self: start;
		}

		.section-heading,
		.recovery-note {
			grid-template-columns: 1fr;
		}

		.guidance li {
			grid-template-columns: 2.5rem 1fr;
		}
	}
</style>
