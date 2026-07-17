import { describe, expect, it } from 'vitest';
import { ServiceError } from '$lib/server/errors';
import { parseItemListQuery, parseSearchQuery, parseTypedItemListQuery } from './_query';

describe('API item query parsing', () => {
	it('parses filters, repeated lists, sorting, and pagination', () => {
		const params = new URLSearchParams([
			['query', 'reading list'],
			['types', 'link,note'],
			['tagIds', '34cb251a-8f35-41f1-968e-ddc95f74b0d3'],
			['tagIds', 'ff759b1d-fd92-4419-8b97-8cc61111e635'],
			['favorite', 'true'],
			['archived', 'false'],
			['sortBy', 'updatedAt'],
			['sortDirection', 'asc'],
			['limit', '25'],
			['cursor', 'opaque-cursor']
		]);

		expect(parseItemListQuery(params)).toEqual({
			query: 'reading list',
			types: ['link', 'note'],
			tagIds: ['34cb251a-8f35-41f1-968e-ddc95f74b0d3', 'ff759b1d-fd92-4419-8b97-8cc61111e635'],
			favorite: true,
			archived: false,
			sortBy: 'updatedAt',
			sortDirection: 'asc',
			limit: 25,
			cursor: 'opaque-cursor'
		});
	});

	it('represents an explicit unorganized collection filter as null', () => {
		expect(parseItemListQuery(new URLSearchParams('collectionId=null'))).toEqual({
			collectionId: null
		});
	});

	it('rejects unknown parameters and invalid booleans', () => {
		expect(() => parseItemListQuery(new URLSearchParams('unknown=value'))).toThrow(ServiceError);
		expect(() => parseItemListQuery(new URLSearchParams('favorite=1'))).toThrow(
			'Query parameter favorite must be true or false'
		);
	});

	it('rejects a types filter on a type-specific route', () => {
		expect(() => parseTypedItemListQuery(new URLSearchParams('types=note'))).toThrow(
			'Unknown query parameter: types'
		);
	});

	it('requires a non-empty search query', () => {
		expect(() => parseSearchQuery(new URLSearchParams())).toThrow(
			'Query parameter query is required'
		);
	});
});
