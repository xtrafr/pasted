<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#fafffa" />
	<meta
		name="description"
		content="Pasted keeps links, notes and reminders in one calm, searchable place."
	/>
</svelte:head>
{@render children()}
