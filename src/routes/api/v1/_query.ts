import { ServiceError } from '$lib/server/errors';
import type { ListItemsInput } from '$lib/server/validation';

const scalarKeys = new Set([
	'query',
	'sourceImportId',
	'collectionId',
	'tagMode',
	'favorite',
	'archived',
	'createdFrom',
	'createdTo',
	'dueFrom',
	'dueTo',
	'sortBy',
	'sortDirection',
	'limit',
	'cursor'
]);

const arrayKeys = new Set(['types', 'states', 'reminderStates', 'tagIds', 'domains']);

function invalidQuery(message: string, path?: string): ServiceError {
	return new ServiceError('validation_failed', message, 400, {
		...(path ? { issues: [{ path, message }] } : {})
	});
}

function ensureKnownKeys(params: URLSearchParams, allowTypes: boolean): void {
	for (const key of new Set(params.keys())) {
		if ((!scalarKeys.has(key) && !arrayKeys.has(key)) || (!allowTypes && key === 'types')) {
			throw invalidQuery(`Unknown query parameter: ${key}`, key);
		}
		if (scalarKeys.has(key) && params.getAll(key).length > 1) {
			throw invalidQuery(`Query parameter ${key} may only be provided once`, key);
		}
	}
}

function optionalString(params: URLSearchParams, key: string): string | undefined {
	const value = params.get(key);
	return value === null || value.trim() === '' ? undefined : value;
}

function optionalBoolean(params: URLSearchParams, key: string): boolean | undefined {
	const value = optionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw invalidQuery(`Query parameter ${key} must be true or false`, key);
}

function optionalList(params: URLSearchParams, key: string): string[] | undefined {
	const values = params
		.getAll(key)
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter(Boolean);
	return values.length > 0 ? values : undefined;
}

function buildListInput(params: URLSearchParams, allowTypes: boolean): ListItemsInput {
	ensureKnownKeys(params, allowTypes);

	const collectionValue = optionalString(params, 'collectionId');
	const limitValue = optionalString(params, 'limit');
	return {
		...(optionalString(params, 'query') ? { query: optionalString(params, 'query') } : {}),
		...(optionalString(params, 'sourceImportId')
			? { sourceImportId: optionalString(params, 'sourceImportId') }
			: {}),
		...(allowTypes && optionalList(params, 'types')
			? { types: optionalList(params, 'types') as ListItemsInput['types'] }
			: {}),
		...(optionalList(params, 'states')
			? { states: optionalList(params, 'states') as ListItemsInput['states'] }
			: {}),
		...(optionalList(params, 'reminderStates')
			? {
					reminderStates: optionalList(params, 'reminderStates') as ListItemsInput['reminderStates']
				}
			: {}),
		...(collectionValue !== undefined
			? { collectionId: collectionValue === 'null' ? null : collectionValue }
			: {}),
		...(optionalList(params, 'tagIds') ? { tagIds: optionalList(params, 'tagIds') } : {}),
		...(optionalString(params, 'tagMode')
			? { tagMode: optionalString(params, 'tagMode') as ListItemsInput['tagMode'] }
			: {}),
		...(optionalList(params, 'domains') ? { domains: optionalList(params, 'domains') } : {}),
		...(optionalBoolean(params, 'favorite') !== undefined
			? { favorite: optionalBoolean(params, 'favorite') }
			: {}),
		...(optionalBoolean(params, 'archived') !== undefined
			? { archived: optionalBoolean(params, 'archived') }
			: {}),
		...(optionalString(params, 'createdFrom')
			? { createdFrom: optionalString(params, 'createdFrom') }
			: {}),
		...(optionalString(params, 'createdTo')
			? { createdTo: optionalString(params, 'createdTo') }
			: {}),
		...(optionalString(params, 'dueFrom') ? { dueFrom: optionalString(params, 'dueFrom') } : {}),
		...(optionalString(params, 'dueTo') ? { dueTo: optionalString(params, 'dueTo') } : {}),
		...(optionalString(params, 'sortBy')
			? { sortBy: optionalString(params, 'sortBy') as ListItemsInput['sortBy'] }
			: {}),
		...(optionalString(params, 'sortDirection')
			? {
					sortDirection: optionalString(params, 'sortDirection') as ListItemsInput['sortDirection']
				}
			: {}),
		...(limitValue !== undefined ? { limit: Number(limitValue) } : {}),
		...(optionalString(params, 'cursor') ? { cursor: optionalString(params, 'cursor') } : {})
	};
}

export function parseItemListQuery(params: URLSearchParams): ListItemsInput {
	return buildListInput(params, true);
}

export function parseTypedItemListQuery(params: URLSearchParams): Omit<ListItemsInput, 'types'> {
	return buildListInput(params, false);
}

export function parseSearchQuery(params: URLSearchParams): ListItemsInput {
	const input = parseItemListQuery(params);
	if (!input.query) {
		throw invalidQuery('Query parameter query is required', 'query');
	}
	return input;
}
