<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import PastedWordmark from './PastedWordmark.svelte';

	let props: ComponentProps<typeof PastedWordmark> = $props();
</script>

<PastedWordmark {...props} />
