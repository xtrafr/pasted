<svelte:head>
	<title>Dashboard | Pasted</title>
</svelte:head>

<main class="dashboard-start">
	<p>Library</p>
	<h1>Everything worth coming back to.</h1>
	<p>Your links, notes and reminders will appear here.</p>
</main>

<style>
	.dashboard-start {
		display: grid;
		max-width: var(--page-max-width);
		gap: var(--space-5);
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 8rem) var(--page-gutter);
	}

	.dashboard-start > p:first-child {
		font-size: var(--text-caption);
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.dashboard-start h1,
	.dashboard-start p {
		margin: 0;
	}

	.dashboard-start h1 {
		max-width: 14ch;
		font-family: var(--font-display);
		font-size: var(--text-heading);
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.04em;
		line-height: 0.92;
	}

	.dashboard-start > p:last-child {
		color: var(--text-muted);
	}
</style>
