import { describe, expect, it } from 'vitest';
import { nextReminderOccurrence, reminderDateTimeFromLocalInput } from './recurrence';

describe('reminder recurrence', () => {
	it('keeps the local wall-clock time across daylight saving changes', () => {
		const next = nextReminderOccurrence(
			new Date('2026-03-28T08:00:00.000Z'),
			'daily',
			'Europe/Madrid',
			new Date('2026-03-28T09:00:00.000Z')
		);
		expect(next?.toISOString()).toBe('2026-03-29T07:00:00.000Z');
	});

	it('moves a Friday weekday reminder to Monday', () => {
		const next = nextReminderOccurrence(
			new Date('2026-07-17T08:30:00.000Z'),
			'weekdays',
			'UTC',
			new Date('2026-07-17T09:00:00.000Z')
		);
		expect(next?.toISOString()).toBe('2026-07-20T08:30:00.000Z');
	});

	it('clamps monthly and yearly dates to the last valid day', () => {
		expect(
			nextReminderOccurrence(
				new Date('2026-01-31T12:00:00.000Z'),
				'monthly',
				'UTC',
				new Date('2026-02-01T00:00:00.000Z')
			)?.toISOString()
		).toBe('2026-02-28T12:00:00.000Z');
		expect(
			nextReminderOccurrence(
				new Date('2024-02-29T12:00:00.000Z'),
				'yearly',
				'UTC',
				new Date('2024-03-01T00:00:00.000Z')
			)?.toISOString()
		).toBe('2025-02-28T12:00:00.000Z');
	});

	it('catches up an overdue recurrence and rejects unsupported rules', () => {
		expect(
			nextReminderOccurrence(
				new Date('2026-07-01T10:00:00.000Z'),
				'weekly',
				'UTC',
				new Date('2026-07-17T09:00:00.000Z')
			)?.toISOString()
		).toBe('2026-07-22T10:00:00.000Z');
		expect(
			nextReminderOccurrence(new Date('2026-07-17T10:00:00.000Z'), 'every sometime', 'UTC')
		).toBeNull();
	});

	it('converts a browser-local due time with its submitted time zone', () => {
		expect(reminderDateTimeFromLocalInput('2026-07-17T10:30', 'Europe/Madrid')?.toISOString()).toBe(
			'2026-07-17T08:30:00.000Z'
		);
		expect(reminderDateTimeFromLocalInput('2026-02-30T10:30', 'UTC')).toBeNull();
		expect(reminderDateTimeFromLocalInput('2026-07-17T10:30', 'Mars/Olympus')).toBeNull();
	});
});
