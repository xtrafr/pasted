<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import AppIcon from './AppIcon.svelte';
	import type { LibraryItem } from './types';

	type ShareRecord = {
		id: string;
		targetType: 'item' | 'collection';
		targetId: string | null;
		targetTitle: string;
		expiresAt: string | null;
		revokedAt: string | null;
		lastAccessedAt: string | null;
		createdAt: string;
	};

	type Props = {
		open?: boolean;
		item: LibraryItem;
		onMessage?: (message: string) => void | Promise<void>;
	};

	let { open = $bindable(false), item, onMessage }: Props = $props();
	let shares = $state<ShareRecord[]>([]);
	let expiry = $state('');
	let createdUrl = $state('');
	let createdShareId = $state('');
	let copied = $state(false);
	let loading = $state(false);
	let creating = $state(false);
	let revokingId = $state('');
	let error = $state('');
	let wasOpen = false;

	const activeShares = $derived(
		shares.filter(
			(share) =>
				share.targetType === 'item' &&
				share.targetId === item.id &&
				share.revokedAt === null &&
				(share.expiresAt === null || new Date(share.expiresAt) > new Date())
		)
	);

	function formatDate(value: string | null): string {
		if (!value) return 'No expiry';
		return new Intl.DateTimeFormat('en', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	async function readPayload<T>(response: Response): Promise<T> {
		const payload = (await response.json()) as {
			ok: boolean;
			data?: T;
			error?: { message?: string };
		};
		if (!response.ok || !payload.ok || payload.data === undefined) {
			throw new Error(payload.error?.message ?? 'The share request could not be completed.');
		}
		return payload.data;
	}

	async function loadShares() {
		loading = true;
		error = '';
		try {
			const response = await fetch(resolve('/api/v1/shares'));
			shares = await readPayload<ShareRecord[]>(response);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Shares could not be loaded.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open && !wasOpen) {
			expiry = '';
			createdUrl = '';
			createdShareId = '';
			copied = false;
			void loadShares();
		}
		wasOpen = open;
	});

	async function createShare() {
		creating = true;
		error = '';
		try {
			const response = await fetch(resolve('/api/v1/shares'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					itemId: item.id,
					expiresAt: expiry ? new Date(expiry).toISOString() : null
				})
			});
			const created = await readPayload<{
				share: { id: string };
				url: string;
			}>(response);
			createdUrl = created.url;
			createdShareId = created.share.id;
			copied = false;
			await loadShares();
			await onMessage?.('A private share URL was created.');
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'The share URL could not be created.';
		} finally {
			creating = false;
		}
	}

	async function copyUrl() {
		if (!createdUrl) return;
		try {
			await navigator.clipboard.writeText(createdUrl);
		} catch {
			const textarea = document.createElement('textarea');
			textarea.value = createdUrl;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.append(textarea);
			textarea.select();
			document.execCommand('copy');
			textarea.remove();
		}
		copied = true;
		await onMessage?.('Share URL copied.');
	}

	async function revokeShare(shareId: string) {
		revokingId = shareId;
		error = '';
		try {
			const response = await fetch(resolve('/api/v1/shares/[id]', { id: shareId }), {
				method: 'DELETE'
			});
			await readPayload<{ id: string; revokedAt: string }>(response);
			shares = shares.map((share) =>
				share.id === shareId ? { ...share, revokedAt: new Date().toISOString() } : share
			);
			if (createdShareId === shareId) {
				createdUrl = '';
				createdShareId = '';
			}
			await onMessage?.('Share access revoked.');
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'The share could not be revoked.';
		} finally {
			revokingId = '';
		}
	}
</script>

<Dialog
	bind:open
	title="Share item"
	description="Create a revocable public URL. The saved item stays private unless you share this URL."
	dismissible={!creating && !revokingId}
>
	<div class="share-panel">
		{#if createdUrl}
			<section class="created-share" aria-labelledby={`created-share-${item.id}`}>
				<div>
					<p class="eyebrow">Ready to copy</p>
					<h3 id={`created-share-${item.id}`}>This URL is shown once</h3>
				</div>
				<div class="copy-row">
					<input
						aria-label="New share URL"
						value={createdUrl}
						readonly
						onclick={(event) => event.currentTarget.select()}
					/>
					<Button size="small" onclick={copyUrl}>
						<AppIcon name={copied ? 'check' : 'copy'} size={17} />
						{copied ? 'Copied' : 'Copy'}
					</Button>
				</div>
				<p>
					Keep the URL somewhere safe. Pasted stores only its secure hash and cannot show it again.
				</p>
			</section>
		{/if}

		<section class="create-share" aria-labelledby={`create-share-${item.id}`}>
			<div>
				<p class="eyebrow">New URL</p>
				<h3 id={`create-share-${item.id}`}>Choose an optional expiry</h3>
			</div>
			<Input
				label="Expiration date and time"
				type="datetime-local"
				bind:value={expiry}
				description="Leave blank to keep the URL active until you revoke it."
			/>
			<Button
				size="small"
				fullWidth
				loading={creating}
				loadingLabel="Creating share URL"
				onclick={createShare}>Create share URL</Button
			>
		</section>

		<section class="active-list" aria-labelledby={`active-shares-${item.id}`}>
			<div class="section-heading">
				<div>
					<p class="eyebrow">Access</p>
					<h3 id={`active-shares-${item.id}`}>Active shares</h3>
				</div>
				<span>{activeShares.length}</span>
			</div>
			{#if loading}
				<p class="empty-copy" role="status">Loading active shares...</p>
			{:else if activeShares.length}
				<ul>
					{#each activeShares as share (share.id)}
						<li>
							<div>
								<strong
									>{share.expiresAt
										? `Expires ${formatDate(share.expiresAt)}`
										: 'No expiry'}</strong
								>
								<small>
									Created {formatDate(share.createdAt)}
									{share.lastAccessedAt ? `, last opened ${formatDate(share.lastAccessedAt)}` : ''}
								</small>
							</div>
							<Button
								variant="outline"
								size="small"
								loading={revokingId === share.id}
								loadingLabel="Revoking share"
								disabled={Boolean(revokingId) && revokingId !== share.id}
								onclick={() => revokeShare(share.id)}>Revoke</Button
							>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty-copy">No active share URLs for this item.</p>
			{/if}
		</section>

		{#if error}<p class="share-error" role="alert">{error}</p>{/if}
	</div>
</Dialog>

<style>
	.share-panel {
		display: grid;
		gap: var(--space-5);
	}

	.share-panel section {
		display: grid;
		gap: 0.9rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		padding: 1rem;
	}

	.created-share {
		background: color-mix(in srgb, var(--surface-accent) 18%, var(--surface-canvas));
	}

	.eyebrow,
	h3,
	p {
		margin: 0;
	}

	.eyebrow {
		color: var(--text-muted);
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	h3 {
		font-family: var(--font-display);
		font-size: 1.65rem;
		font-weight: var(--font-weight-regular);
		letter-spacing: -0.025em;
	}

	.created-share > p,
	.empty-copy,
	.active-list small {
		color: var(--text-muted);
		font-size: var(--text-body-small);
		line-height: var(--leading-body-small);
	}

	.copy-row,
	.section-heading,
	.active-list li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.copy-row input {
		width: 100%;
		min-width: 0;
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0 0.75rem;
	}

	.section-heading {
		justify-content: space-between;
	}

	.section-heading > span {
		display: grid;
		min-width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: var(--radius-full);
		background: var(--surface-subtle);
		font-size: var(--text-body-small);
	}

	.active-list ul {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.active-list li {
		justify-content: space-between;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding-top: 0.75rem;
	}

	.active-list li > div,
	.active-list small {
		display: grid;
		gap: 0.2rem;
	}

	.active-list strong {
		font-size: var(--text-body-compact);
		font-weight: var(--font-weight-medium);
	}

	.share-error {
		border-left: 3px solid var(--color-press-black);
		padding-left: 0.75rem;
		font-size: var(--text-body-small);
	}

	@media (max-width: 32rem) {
		.copy-row,
		.active-list li {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
