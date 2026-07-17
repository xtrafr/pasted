<script lang="ts">
	import { onMount } from 'svelte';
	import AppIcon from './AppIcon.svelte';
	import type { LibraryItem } from './types';

	let { reminders }: { reminders: LibraryItem[] } = $props();
	let dismissed = $state(false);
	let permission = $state<NotificationPermission | 'unsupported'>('unsupported');
	let feedback = $state('');
	let now = $state(Date.now());

	const storageKey = 'pasted-notified-reminders-v1';
	const due = $derived(
		reminders.filter(
			(reminder) =>
				reminder.type === 'reminder' &&
				reminder.reminderState === 'pending' &&
				reminder.dueAt !== null &&
				reminder.dueAt.getTime() <= now
		)
	);

	function sentKeys(): Set<string> {
		try {
			const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
			return new Set(
				Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : []
			);
		} catch {
			return new Set();
		}
	}

	function notificationKey(reminder: LibraryItem): string {
		return `${reminder.id}:${reminder.dueAt?.toISOString() ?? ''}`;
	}

	function sendDueNotifications(): number {
		if (!('Notification' in window) || Notification.permission !== 'granted') return 0;
		const sent = sentKeys();
		let count = 0;
		for (const reminder of due) {
			const key = notificationKey(reminder);
			if (sent.has(key)) continue;
			const notification = new Notification(reminder.title ?? 'Pasted reminder', {
				body: reminder.reminderDescription ?? 'A saved reminder is due.',
				tag: `pasted-reminder-${reminder.id}`
			});
			notification.onclick = () => {
				window.focus();
				notification.close();
			};
			sent.add(key);
			count += 1;
		}
		localStorage.setItem(storageKey, JSON.stringify([...sent].slice(-500)));
		return count;
	}

	async function enableBrowserNotifications() {
		if (!('Notification' in window)) {
			permission = 'unsupported';
			feedback = 'This browser does not support system notifications.';
			return;
		}
		permission = await Notification.requestPermission();
		if (permission === 'granted') {
			const count = sendDueNotifications();
			feedback = count
				? `${count} due ${count === 1 ? 'reminder was' : 'reminders were'} sent to this device.`
				: 'Browser reminders are enabled on this device.';
		} else {
			feedback = 'Browser notifications remain off. Due reminders still appear inside Pasted.';
		}
	}

	function formatDue(value: Date): string {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(value);
	}

	onMount(() => {
		permission = 'Notification' in window ? Notification.permission : 'unsupported';
		if (permission === 'granted') sendDueNotifications();
		const timer = setInterval(() => {
			now = Date.now();
			if (permission === 'granted') sendDueNotifications();
		}, 30_000);
		return () => clearInterval(timer);
	});
</script>

{#if due.length && !dismissed}
	<section class="reminder-alerts" aria-labelledby="due-reminders-title">
		<div class="reminder-alerts__head">
			<div>
				<AppIcon name="bell" size={20} />
				<div>
					<p>Due now</p>
					<h2 id="due-reminders-title">
						{due.length}
						{due.length === 1 ? 'reminder needs' : 'reminders need'} your attention
					</h2>
				</div>
			</div>
			<button
				type="button"
				aria-label="Dismiss due reminder notice"
				onclick={() => (dismissed = true)}
			>
				Close
			</button>
		</div>

		<ul>
			{#each due.slice(0, 3) as reminder (reminder.id)}
				<li>
					<strong>{reminder.title ?? 'Untitled reminder'}</strong>
					{#if reminder.dueAt}<time datetime={reminder.dueAt.toISOString()}
							>{formatDue(reminder.dueAt)}</time
						>{/if}
				</li>
			{/each}
		</ul>

		<div class="reminder-alerts__actions">
			{#if permission === 'default'}
				<button type="button" class="enable" onclick={enableBrowserNotifications}>
					Enable browser notifications
				</button>
			{:else if permission === 'granted'}
				<span><AppIcon name="check" size={16} /> Browser notifications enabled</span>
			{:else}
				<span>System notifications are off. In-app reminders stay active.</span>
			{/if}
			{#if due.length > 3}<span>And {due.length - 3} more</span>{/if}
		</div>
		{#if feedback}<p class="feedback" role="status">{feedback}</p>{/if}
	</section>
{/if}

<style>
	.reminder-alerts {
		display: grid;
		gap: 1rem;
		margin-bottom: var(--space-5);
		border: var(--border-hairline) solid var(--border-default);
		border-left: 0.35rem solid var(--surface-accent);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--surface-accent) 14%, var(--surface-canvas));
		padding: 1rem;
	}

	.reminder-alerts__head,
	.reminder-alerts__head > div,
	.reminder-alerts__actions,
	li,
	.reminder-alerts__actions span {
		display: flex;
		align-items: center;
	}

	.reminder-alerts__head {
		justify-content: space-between;
		gap: 1rem;
	}

	.reminder-alerts__head > div {
		gap: 0.75rem;
	}

	.reminder-alerts p,
	.reminder-alerts h2 {
		margin: 0;
	}

	.reminder-alerts__head p {
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
	}

	.reminder-alerts h2 {
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: var(--font-weight-regular);
	}

	.reminder-alerts__head button,
	.enable {
		min-height: 2.75rem;
		border: var(--border-hairline) solid var(--border-default);
		border-radius: var(--radius-button);
		background: var(--surface-canvas);
		color: inherit;
		padding: 0.6rem 0.8rem;
	}

	ul {
		display: grid;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		justify-content: space-between;
		gap: 1rem;
		border-top: var(--border-hairline) solid var(--border-subtle);
		padding-top: 0.55rem;
		font-size: var(--text-body-small);
	}

	time {
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	.reminder-alerts__actions {
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: var(--text-body-small);
	}

	.reminder-alerts__actions span {
		gap: 0.4rem;
	}

	.feedback {
		color: var(--text-muted);
		font-size: var(--text-body-small);
	}

	@media (max-width: 40rem) {
		li,
		.reminder-alerts__actions {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
