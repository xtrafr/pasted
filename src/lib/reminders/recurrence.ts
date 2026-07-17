export const REMINDER_RECURRENCES = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as const;

export type ReminderRecurrence = (typeof REMINDER_RECURRENCES)[number];

export const REMINDER_RECURRENCE_OPTIONS: ReadonlyArray<{
	value: ReminderRecurrence;
	label: string;
}> = [
	{ value: 'daily', label: 'Every day' },
	{ value: 'weekdays', label: 'Every weekday' },
	{ value: 'weekly', label: 'Every week' },
	{ value: 'monthly', label: 'Every month' },
	{ value: 'yearly', label: 'Every year' }
];

interface DateTimeParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
}

export function isReminderRecurrence(value: string): value is ReminderRecurrence {
	return REMINDER_RECURRENCES.includes(value as ReminderRecurrence);
}

function zonedParts(date: Date, timeZone: string): DateTimeParts {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const values = Object.fromEntries(
		formatter
			.formatToParts(date)
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, Number(part.value)])
	);
	return {
		year: values.year!,
		month: values.month!,
		day: values.day!,
		hour: values.hour!,
		minute: values.minute!,
		second: values.second!,
		millisecond: date.getUTCMilliseconds()
	};
}

function partsTimestamp(parts: DateTimeParts): number {
	return Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
		parts.millisecond
	);
}

function zonedDate(parts: DateTimeParts, timeZone: string): Date {
	const desired = partsTimestamp(parts);
	let timestamp = desired;
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const actual = partsTimestamp(zonedParts(new Date(timestamp), timeZone));
		const difference = desired - actual;
		if (difference === 0) break;
		timestamp += difference;
	}
	return new Date(timestamp);
}

function calendarDate(parts: DateTimeParts, addedDays: number): DateTimeParts {
	const date = new Date(partsTimestamp(parts));
	date.setUTCDate(date.getUTCDate() + addedDays);
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		hour: parts.hour,
		minute: parts.minute,
		second: parts.second,
		millisecond: parts.millisecond
	};
}

function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function reminderDateTimeFromLocalInput(value: string, timeZone: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
		value
	);
	if (!match) return null;
	const parts: DateTimeParts = {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
		hour: Number(match[4]),
		minute: Number(match[5]),
		second: Number(match[6] ?? 0),
		millisecond: Number((match[7] ?? '').padEnd(3, '0'))
	};
	if (
		parts.year < 1 ||
		parts.month < 1 ||
		parts.month > 12 ||
		parts.day < 1 ||
		parts.day > daysInMonth(parts.year, parts.month) ||
		parts.hour > 23 ||
		parts.minute > 59 ||
		parts.second > 59
	) {
		return null;
	}
	try {
		const date = zonedDate(parts, timeZone);
		const roundTrip = zonedParts(date, timeZone);
		return partsTimestamp(parts) === partsTimestamp(roundTrip) ? date : null;
	} catch {
		return null;
	}
}

function addMonth(parts: DateTimeParts): DateTimeParts {
	const monthIndex = parts.month;
	const year = parts.year + Math.floor(monthIndex / 12);
	const month = (monthIndex % 12) + 1;
	return { ...parts, year, month, day: Math.min(parts.day, daysInMonth(year, month)) };
}

function addYear(parts: DateTimeParts): DateTimeParts {
	const year = parts.year + 1;
	return { ...parts, year, day: Math.min(parts.day, daysInMonth(year, parts.month)) };
}

function advanceOccurrence(date: Date, recurrence: ReminderRecurrence, timeZone: string): Date {
	const parts = zonedParts(date, timeZone);
	let next: DateTimeParts;
	switch (recurrence) {
		case 'daily':
			next = calendarDate(parts, 1);
			break;
		case 'weekdays': {
			next = calendarDate(parts, 1);
			while ([0, 6].includes(new Date(partsTimestamp(next)).getUTCDay())) {
				next = calendarDate(next, 1);
			}
			break;
		}
		case 'weekly':
			next = calendarDate(parts, 7);
			break;
		case 'monthly':
			next = addMonth(parts);
			break;
		case 'yearly':
			next = addYear(parts);
			break;
	}
	return zonedDate(next, timeZone);
}

export function nextReminderOccurrence(
	dueAt: Date,
	recurrence: string | null,
	timeZone: string,
	now: Date = new Date()
): Date | null {
	if (!recurrence || !isReminderRecurrence(recurrence) || Number.isNaN(dueAt.getTime()))
		return null;
	let next = dueAt;
	for (let occurrence = 0; occurrence < 100_000; occurrence += 1) {
		next = advanceOccurrence(next, recurrence, timeZone);
		if (next > now) return next;
	}
	return null;
}
