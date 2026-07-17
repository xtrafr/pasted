import { describe, expect, it } from 'vitest';
import { toPublicItem, type PublicItemSource } from './service';

const base = {
	title: 'A public title',
	description: 'A public description',
	createdAt: new Date('2026-07-17T12:00:00.000Z'),
	url: null,
	domain: null,
	metadataTitle: null,
	metadataDescription: null,
	siteName: null,
	noteBody: null,
	reminderDescription: null,
	dueAt: null,
	reminderState: null,
	recurrence: null,
	timeZone: null
} satisfies Omit<PublicItemSource, 'type'>;

describe('public share data', () => {
	it('keeps a link share to an explicit read-only projection', () => {
		const source = {
			...base,
			type: 'link' as const,
			url: 'https://example.com/article',
			domain: 'example.com',
			metadataTitle: 'An article',
			metadataDescription: 'An excerpt',
			siteName: 'Example',
			userId: 'private-owner',
			personalNotes: 'private notes',
			tokenHash: 'private-token-hash'
		};

		const result = toPublicItem(source);
		const serialized = JSON.stringify(result);

		expect(result).toEqual({
			type: 'link',
			title: 'A public title',
			description: 'A public description',
			createdAt: new Date('2026-07-17T12:00:00.000Z'),
			link: {
				url: 'https://example.com/article',
				domain: 'example.com',
				metadataTitle: 'An article',
				metadataDescription: 'An excerpt',
				siteName: 'Example'
			}
		});
		expect(serialized).not.toContain('private-owner');
		expect(serialized).not.toContain('private notes');
		expect(serialized).not.toContain('private-token-hash');
	});
});
