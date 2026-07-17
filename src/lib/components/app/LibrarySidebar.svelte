<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths';
	import AppIcon from './AppIcon.svelte';
	import type { LibraryCollection } from './types';

	let {
		collections,
		activeView = 'all',
		activeCollection = '',
		open = false,
		onClose
	}: {
		collections: LibraryCollection[];
		activeView?: string;
		activeCollection?: string;
		open?: boolean;
		onClose?: () => void;
	} = $props();

	const navigation = [
		{ label: 'All items', value: 'all', icon: 'all' as const },
		{ label: 'Favorites', value: 'favorites', icon: 'star' as const },
		{ label: 'Reminders', value: 'reminders', icon: 'bell' as const },
		{ label: 'Archived', value: 'archived', icon: 'archive' as const }
	];
</script>

{#if open}
	<button class="sidebar-backdrop" type="button" aria-label="Close navigation" onclick={onClose}
	></button>
{/if}

<aside class:open class="library-sidebar" aria-label="Library navigation">
	<div class="sidebar-mobile-head">
		<strong>Library</strong>
		<button type="button" aria-label="Close navigation" onclick={onClose}>Close</button>
	</div>

	<nav>
		<p class="nav-label">Library</p>
		{#each navigation as item (item.value)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a
				href={`${resolve('/app')}?view=${item.value}`}
				class:active={activeView === item.value && !activeCollection}
				onclick={onClose}
			>
				<AppIcon name={item.icon} size={18} />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<nav class="collections-nav">
		<div class="nav-heading">
			<p class="nav-label">Collections</p>
			<span>{collections.length + 1}</span>
		</div>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a
			href={`${resolve('/app')}?collection=unorganized`}
			class:active={activeCollection === 'unorganized'}
			onclick={onClose}
		>
			<span class="collection-dot unorganized"></span>
			<span>Unorganized</span>
		</a>
		{#each collections as collection (collection.id)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a
				href={`${resolve('/app')}?collection=${collection.id}`}
				class:active={activeCollection === collection.id}
				onclick={onClose}
			>
				<span class="collection-dot" style:background={collection.color ?? '#d8ff78'}></span>
				<span>{collection.name}</span>
				<small>{collection.itemCount}</small>
			</a>
		{/each}
	</nav>

	<div class="sidebar-actions">
		<a href={resolve('/app/import')}><AppIcon name="import" size={18} /> Import</a>
		<a href={resolve('/app/export')}><AppIcon name="bookmark" size={18} /> Export</a>
	</div>
</aside>

<style>
	.library-sidebar {
		position: sticky;
		top: 0;
		display: flex;
		height: calc(100dvh - 4.5rem);
		flex-direction: column;
		gap: var(--space-7-5);
		border-right: var(--border-hairline) solid var(--border-default);
		background: var(--surface-canvas);
		padding: var(--space-7-5) var(--space-5);
		overflow-y: auto;
	}

	nav,
	.sidebar-actions {
		display: grid;
		gap: 0.3rem;
	}

	.nav-label {
		margin: 0 0 0.55rem;
		color: var(--text-muted);
		font-size: 0.67rem;
		font-weight: var(--font-weight-medium);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.nav-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.nav-heading span {
		color: var(--text-muted);
		font-size: 0.7rem;
	}

	a {
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.75rem;
		border-radius: var(--radius-button);
		color: var(--text-primary);
		padding: 0.7rem 0.8rem;
		font-size: var(--text-body-small);
		text-decoration: none;
		transition:
			background-color var(--motion-fast) var(--ease-out),
			transform var(--motion-fast) var(--ease-out);
	}

	a:hover {
		background: var(--surface-subtle);
		transform: translateX(2px);
	}

	a.active {
		background: var(--color-press-black);
		color: var(--text-inverse);
	}

	a small {
		margin-left: auto;
		color: inherit;
		opacity: 0.62;
	}

	.collection-dot {
		width: 0.62rem;
		height: 0.62rem;
		flex: 0 0 auto;
		border: 1px solid rgb(18 22 19 / 18%);
		border-radius: 50%;
	}

	.collection-dot.unorganized {
		background: var(--surface-subtle);
	}

	.sidebar-actions {
		margin-top: auto;
		padding-top: var(--space-5);
		border-top: var(--border-hairline) solid var(--border-subtle);
	}

	.sidebar-mobile-head,
	.sidebar-backdrop {
		display: none;
	}

	@media (max-width: 58rem) {
		.library-sidebar {
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 70;
			width: min(20rem, calc(100vw - 3rem));
			height: 100dvh;
			transform: translateX(-105%);
			transition: transform var(--motion-standard) var(--ease-out);
		}

		.library-sidebar.open {
			transform: translateX(0);
		}

		.sidebar-backdrop {
			position: fixed;
			inset: 0;
			z-index: 60;
			display: block;
			width: 100%;
			height: 100%;
			border: 0;
			background: rgb(18 22 19 / 62%);
		}

		.sidebar-mobile-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-bottom: var(--space-5);
			border-bottom: var(--border-hairline) solid var(--border-subtle);
		}

		.sidebar-mobile-head button {
			min-height: 2.75rem;
			border: 0;
			background: transparent;
			text-decoration: underline;
		}
	}
</style>
