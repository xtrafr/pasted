<script lang="ts">
	type IconName =
		| 'all'
		| 'archive'
		| 'bell'
		| 'bookmark'
		| 'check'
		| 'chevron'
		| 'collection'
		| 'grid'
		| 'import'
		| 'link'
		| 'list'
		| 'menu'
		| 'note'
		| 'plus'
		| 'search'
		| 'star'
		| 'tag';

	let {
		name,
		size = 20,
		strokeWidth = 1.6
	}: { name: IconName; size?: number; strokeWidth?: number } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'all'}
		<path d="M4 5.5h16M4 12h16M4 18.5h16" />
	{:else if name === 'archive'}
		<path d="M4 8h16v11H4zM3 4h18v4H3zM9 12h6" />
	{:else if name === 'bell'}
		<path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4" />
	{:else if name === 'bookmark'}
		<path d="M6 4h12v17l-6-4-6 4z" />
	{:else if name === 'check'}
		<path d="m5 12 4 4L19 6" />
	{:else if name === 'chevron'}
		<path d="m9 5 7 7-7 7" />
	{:else if name === 'collection'}
		<path d="M3 7h7l2-3h9v15H3z" />
	{:else if name === 'grid'}
		<rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" />
		<rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" />
	{:else if name === 'import'}
		<path d="M12 3v12m-4-4 4 4 4-4M4 19h16" />
	{:else if name === 'link'}
		<path
			d="m10 14 4-4M8.5 16.5l-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M15.5 7.5l1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0"
		/>
	{:else if name === 'list'}
		<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
	{:else if name === 'menu'}
		<path d="M4 7h16M4 12h16M4 17h16" />
	{:else if name === 'note'}
		<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h6" />
	{:else if name === 'plus'}
		<path d="M12 5v14M5 12h14" />
	{:else if name === 'search'}
		<circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
	{:else if name === 'star'}
		<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
	{:else if name === 'tag'}
		<path d="M3 11V4h7l11 11-7 7z" /><circle cx="7.5" cy="8" r="1" />
	{/if}
</svg>
