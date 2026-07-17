# Internal API

Pasted exposes a JSON API under `/api/v1` for its own web interface. It is not a stable public API yet. Routes use the Better Auth session cookie and the same-origin protections of the SvelteKit application. The `api_tokens` table is reserved for future public token authentication and is not accepted by these handlers.

Better Auth mounts its own handlers under `/api/auth/*`. Use the application login, register, logout, and security screens or the Better Auth client rather than depending on undocumented auth handler details.

`GET /api/health` is the public container health endpoint. It runs a minimal database query and
returns `200` with `{"status":"ok","checks":{"database":"ok"}}`, or `503` with an unavailable
database check. It never includes connection details and is not part of the versioned authenticated
API.

## Authentication

All `/api/v1` routes require an authenticated session, including metadata assets. A missing or invalid session returns `401`.

Browser requests should send JSON and same-origin credentials:

```ts
const response = await fetch('/api/v1/links', {
	method: 'POST',
	credentials: 'same-origin',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ originalUrl: 'https://example.com/guide' })
});
```

State-changing JSON endpoints accept only `application/json` or a media type ending in `+json`. Unknown object fields are rejected by strict Zod schemas.

## Response format

Normal success:

```json
{
	"ok": true,
	"data": {
		"id": "2f24285c-949a-4ff9-9b2a-984b870f705f"
	}
}
```

Normal error:

```json
{
	"ok": false,
	"error": {
		"code": "validation_failed",
		"message": "The request contains invalid values",
		"details": {
			"issues": [{ "path": "originalUrl", "message": "Required" }]
		}
	}
}
```

Known error codes are `unauthorized`, `validation_failed`, `not_found`, `conflict`, `duplicate_link`, `invalid_relation`, and `database_error`. Validation details can be returned for client errors. Internal errors do not expose database details. Responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` unless an endpoint documents another cache policy.

Export downloads and metadata assets return raw bytes rather than the JSON envelope.

## Item queries

These query parameters apply to `GET /api/v1/items`, `/links`, `/notes`, `/reminders`, and `/search` where relevant.

| Parameter                  | Values                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `query`                    | Search text, maximum 300 characters                                                    |
| `sourceImportId`           | Import session UUID; returns links created by that session                             |
| `types`                    | Repeated or comma-separated `link`, `note`, `reminder`; only on `/items` and `/search` |
| `states`                   | Repeated or comma-separated `active`, `read`, `broken`                                 |
| `reminderStates`           | Repeated or comma-separated `pending`, `completed`                                     |
| `collectionId`             | Collection UUID, or literal `null` for unorganized                                     |
| `tagIds`                   | Repeated or comma-separated tag UUIDs, up to 50                                        |
| `tagMode`                  | `all`, default, or `any`                                                               |
| `domains`                  | Repeated or comma-separated lowercased domains, up to 50                               |
| `favorite`                 | `true` or `false`                                                                      |
| `archived`                 | `true` or `false`, default `false`                                                     |
| `createdFrom`, `createdTo` | ISO 8601 timestamp with offset                                                         |
| `dueFrom`, `dueTo`         | ISO 8601 timestamp with offset                                                         |
| `sortBy`                   | `createdAt`, `updatedAt`, `title`, `domain`, or `dueAt`                                |
| `sortDirection`            | `asc` or `desc`, default `desc`                                                        |
| `limit`                    | 1 to 100, default 40                                                                   |
| `cursor`                   | Opaque cursor returned by the previous page                                            |

Array parameters can be repeated, such as `tagIds=a&tagIds=b`, or comma-separated. Scalar parameters may appear once. Unknown query parameters are rejected. A list response contains `items`, `hasMore`, and `nextCursor` when another page exists. `nextCursor` is omitted on the final page.

Example:

```http
GET /api/v1/items?sourceImportId=IMPORT_ID&types=link&sortBy=createdAt&limit=40
```

## Content routes

| Method   | Route                               | Purpose                                                   |
| -------- | ----------------------------------- | --------------------------------------------------------- |
| `GET`    | `/api/v1/items`                     | List mixed owned items with filters and cursor pagination |
| `GET`    | `/api/v1/items/{id}`                | Get one owned item with its type-specific fields and tags |
| `DELETE` | `/api/v1/items/{id}`                | Delete any owned item                                     |
| `POST`   | `/api/v1/items/bulk`                | Apply one bulk action to up to 500 owned item IDs         |
| `PUT`    | `/api/v1/items/{id}/favorite`       | Set favorite state from `{ "favorite": boolean }`         |
| `PUT`    | `/api/v1/items/{id}/archived`       | Set archive state from `{ "archived": boolean }`          |
| `PUT`    | `/api/v1/items/{id}/tags`           | Replace all item tags from `{ "tagIds": UUID[] }`         |
| `GET`    | `/api/v1/links`                     | List links using item query parameters                    |
| `POST`   | `/api/v1/links`                     | Create a link                                             |
| `GET`    | `/api/v1/links/{id}`                | Get one link by item ID                                   |
| `PATCH`  | `/api/v1/links/{id}`                | Update a link                                             |
| `DELETE` | `/api/v1/links/{id}`                | Delete a link                                             |
| `GET`    | `/api/v1/notes`                     | List notes using item query parameters                    |
| `POST`   | `/api/v1/notes`                     | Create a note                                             |
| `GET`    | `/api/v1/notes/{id}`                | Get one note by item ID                                   |
| `PATCH`  | `/api/v1/notes/{id}`                | Update a note                                             |
| `DELETE` | `/api/v1/notes/{id}`                | Delete a note                                             |
| `GET`    | `/api/v1/reminders`                 | List reminders using item query parameters                |
| `POST`   | `/api/v1/reminders`                 | Create a reminder                                         |
| `GET`    | `/api/v1/reminders/{id}`            | Get one reminder by item ID                               |
| `PATCH`  | `/api/v1/reminders/{id}`            | Update a reminder                                         |
| `DELETE` | `/api/v1/reminders/{id}`            | Delete a reminder                                         |
| `PUT`    | `/api/v1/reminders/{id}/completion` | Set completion from `{ "completed": boolean }`            |

### Create link

`POST /api/v1/links`

```json
{
	"originalUrl": "https://example.com/article?utm_source=newsletter",
	"title": "Read later",
	"description": "Optional short description",
	"personalNotes": "Start with section two",
	"collectionId": null,
	"tagIds": [],
	"favorite": false,
	"archived": false,
	"sourceDate": "2026-07-17T10:30:00+02:00",
	"importedTitle": null,
	"sourceType": "manual",
	"sourceImportId": null,
	"allowDuplicate": false
}
```

Only `originalUrl` is required. URLs are limited to 8,192 characters and normalized again on the server. By default an existing normalized target returns `409 duplicate_link`. Set `allowDuplicate` only when the user has made an explicit duplicate choice.

`PATCH /api/v1/links/{id}` accepts the same editable fields plus `state`. It requires at least one actual change. `allowDuplicate` is valid only when `originalUrl` is also being changed.

### Create note

`POST /api/v1/notes`

```json
{
	"title": "Optional title",
	"body": "Markdown-compatible note body",
	"collectionId": null,
	"tagIds": [],
	"favorite": false,
	"archived": false
}
```

`body` is required and limited to 100,000 characters. `PATCH /api/v1/notes/{id}` accepts `body` and common item fields and requires at least one change.

### Create reminder

`POST /api/v1/reminders`

```json
{
	"title": "Review saved reading",
	"description": "Choose one article",
	"dueAt": "2026-07-20T18:00:00+02:00",
	"recurrence": null,
	"timeZone": "Europe/Madrid",
	"collectionId": null,
	"tagIds": []
}
```

`title`, `dueAt`, and a valid IANA `timeZone` are required; the time zone defaults to `UTC`. Recurrence is optional text with a 500-character limit. `PATCH /api/v1/reminders/{id}` also accepts `reminderState`. The completion endpoint sets `completedAt` consistently with the requested boolean.

### Common item fields

Titles are at most 300 characters. Descriptions are at most 2,000 characters. `collectionId` may be a UUID or null. `tagIds` contains up to 50 unique UUIDs. `state` is `active`, `read`, or `broken`. Date inputs must be ISO 8601 timestamps with an offset.

### Bulk action

`POST /api/v1/items/bulk`

```json
{
	"action": "move_collection",
	"itemIds": ["ITEM_UUID"],
	"collectionId": null
}
```

Supported actions are:

- `favorite`, `unfavorite`, `archive`, `unarchive`, `delete`
- `move_collection` with `collectionId`, which may be null
- `add_tags` or `remove_tags` with a non-empty `tagIds` array

The server verifies ownership for the complete set before applying the action.

## Collections and tags

| Method   | Route                      | Purpose                                       |
| -------- | -------------------------- | --------------------------------------------- |
| `GET`    | `/api/v1/collections`      | List owned collections with item counts       |
| `POST`   | `/api/v1/collections`      | Create a collection                           |
| `GET`    | `/api/v1/collections/{id}` | Get one collection and its item count         |
| `PATCH`  | `/api/v1/collections/{id}` | Update a collection                           |
| `DELETE` | `/api/v1/collections/{id}` | Move its items to unorganized, then delete it |
| `GET`    | `/api/v1/tags`             | List owned tags with item counts              |
| `POST`   | `/api/v1/tags`             | Create a tag                                  |
| `GET`    | `/api/v1/tags/{id}`        | Get one tag and its item count                |
| `PATCH`  | `/api/v1/tags/{id}`        | Update a tag                                  |
| `DELETE` | `/api/v1/tags/{id}`        | Remove the tag relations, then delete it      |

Create collection body:

```json
{
	"name": "Reading list",
	"description": "Long reads",
	"color": "#2bee4b",
	"icon": "book-open",
	"sortOrder": 0,
	"sortMode": "manual"
}
```

`name` is required and limited to 120 characters. `color` is null or a six-digit hexadecimal value. `icon` is null or up to 64 letters, numbers, and hyphens. `sortMode` is `manual`, `created_at`, or `title`.

Create tag body:

```json
{
	"name": "design",
	"color": "#2bee4b"
}
```

Tag names are required and limited to 80 characters. Names are unique per account. Patch bodies require at least one field.

## Search

`GET /api/v1/search?query=field+guide`

Search accepts the item query parameters but requires a non-empty `query`. It returns the same paginated shape as `/api/v1/items`. Search documents include item titles and descriptions, normalized URLs and domains, link metadata, note bodies, reminder descriptions, tag names, and collection names.

## Import routes

| Method  | Route                          | Purpose                                                    |
| ------- | ------------------------------ | ---------------------------------------------------------- |
| `POST`  | `/api/v1/imports`              | Create or replay an idempotent candidate review session    |
| `GET`   | `/api/v1/imports/{id}`         | Get owned session counters, progress, and candidate rows   |
| `PATCH` | `/api/v1/imports/{id}`         | Change selection, titles, collection, tags, or source type |
| `POST`  | `/api/v1/imports/{id}/batches` | Import the next selected batch                             |
| `POST`  | `/api/v1/imports/{id}/cancel`  | Cancel a session at a safe boundary                        |
| `POST`  | `/api/v1/imports/{id}/retry`   | Return failed candidates to the import queue               |
| `POST`  | `/api/v1/imports/restore`      | Restore a complete Pasted backup transactionally           |

### Create candidate session

```json
{
	"idempotencyKey": "import:browser-session:1",
	"format": "whatsapp",
	"sourceType": "whatsapp",
	"collectionId": null,
	"tagIds": [],
	"ignoredCount": 14,
	"candidates": [
		{
			"id": "candidate-1",
			"originalUrl": "https://example.com/guide",
			"title": null,
			"sourceDate": "2026-07-17T10:30:00",
			"selected": true,
			"secretKinds": []
		}
	]
}
```

The idempotency key must be 8 to 128 characters using letters, numbers, dots, colons, underscores, or hyphens. Formats are `text`, `whatsapp`, `json`, `pasted-json`, `csv`, `markdown`, `html`, and `netscape-bookmarks`. A request contains 1 to 10,000 candidates. The server does not accept filenames, source excerpts, sender names, or raw file content.

Review patch:

```json
{
	"selectedCandidateKeys": ["candidate-1"],
	"candidateTitles": [{ "candidateKey": "candidate-1", "title": "A small field guide" }],
	"collectionId": null,
	"tagIds": [],
	"sourceType": "whatsapp"
}
```

Batch body:

```json
{
	"idempotencyKey": "batch:browser-session:1",
	"batchSize": 50
}
```

`batchSize` is 1 to 100. Retry accepts an idempotency key and optional candidate keys. Omitting candidate keys retries all failed candidates.

### Restore Pasted backup

```json
{
	"idempotencyKey": "restore:browser-session:1",
	"backup": {
		"format": "pasted-backup",
		"version": 1,
		"exportedAt": "2026-07-17T10:30:00.000Z",
		"generator": { "name": "Pasted", "version": "0.0.1" },
		"manifest": {},
		"data": { "collections": [], "tags": [], "items": [] }
	}
}
```

The abbreviated manifest above is illustrative; real requests must contain the full validated version 1 manifest described in [the import format guide](import-format.md). The import reader enforces file and decoded-data limits. Browser and server structured validation reject unknown fields and enforce the versioned shape, identifiers, references, field bounds, dates, URLs, and cardinality limits. The endpoint returns `201` and counts for created collections, tags, links, notes, reminders, and total items. Replaying the same key and backup returns the stored summary with `replayed: true`. Using a consumed key for different backup content returns `409`.

Backup JSON does not carry favicon or preview image bytes. The restore keeps permitted textual metadata, marks each restored link target pending, and queues the normal metadata worker to fetch fresh text and validated image assets.

## Export route

`POST /api/v1/exports` returns a file download.

```json
{
	"format": "pasted-json",
	"scope": "all",
	"privacy": {
		"includePersonalNotes": true,
		"includeSourceDates": true,
		"includeLinkMetadata": true,
		"includeNoteBodies": true,
		"includeReminderDescriptions": true
	},
	"includeTitlesInTxt": false
}
```

Formats are `pasted-json`, `simple-json`, `csv`, `txt`, `markdown`, `netscape-bookmarks`, and `zip`.

Scopes and required fields:

| Scope        | Additional field                                         |
| ------------ | -------------------------------------------------------- |
| `all`        | None                                                     |
| `collection` | `collectionId`, UUID or null for unorganized             |
| `domain`     | `domain`                                                 |
| `favorites`  | None                                                     |
| `reminders`  | None                                                     |
| `date`       | Optional `createdFrom` and `createdTo` offset timestamps |
| `manual`     | Non-empty `itemIds`, maximum 10,000                      |
| `search`     | Non-empty `query`, maximum 300 characters                |

Manual scope exports exactly the owned item IDs submitted by the current dashboard selection. Search scope reruns the same owned full-text query used by the library, excludes archived items, and is limited to 10,000 matches. The response sets `Content-Disposition`, `Content-Type`, `Content-Length`, and `X-Pasted-Item-Count`. The server caps a complete account export at 100,000 items.

## Metadata routes

The `targetId` used here is a link target UUID from a returned link item, not the item UUID.

| Method | Route                          | Purpose                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------ |
| `POST` | `/api/v1/metadata`             | Queue by JSON body `{ "targetId": UUID, "force"?: boolean }` |
| `GET`  | `/api/v1/metadata/{targetId}`  | Read owned metadata, state, errors, dates, and asset URLs    |
| `POST` | `/api/v1/metadata/{targetId}`  | Queue by route ID; optional `?force=true`                    |
| `GET`  | `/api/v1/metadata/assets/{id}` | Return an owned validated image asset                        |

Queue endpoints return `202`. A ready target fetched within the six-hour freshness window returns `queued: false` unless forced. A target already fetching or an existing singleton job also returns a reason instead of adding another job.

Asset responses are private, use a content hash ETag, and set `Cache-Control: private, max-age=86400, immutable`. Ownership is checked before bytes are returned.

While a link is `pending` or `fetching`, the authenticated card UI polls the target status for a bounded period. It replaces the fallback title and status progressively when metadata becomes ready and loads returned favicon or preview URLs only through the owner-checked asset route.

## Share routes

| Method   | Route                 | Purpose                                       |
| -------- | --------------------- | --------------------------------------------- |
| `GET`    | `/api/v1/shares`      | List owned shares without raw tokens          |
| `POST`   | `/api/v1/shares`      | Create a share and reveal its token once      |
| `DELETE` | `/api/v1/shares/{id}` | Revoke an active owned share                  |
| `GET`    | `/s/{token}`          | Public read-only HTML page, outside `/api/v1` |

Create exactly one target:

```json
{
	"itemId": "ITEM_UUID",
	"expiresAt": "2026-08-01T12:00:00+02:00"
}
```

or:

```json
{
	"collectionId": "COLLECTION_UUID",
	"expiresAt": null
}
```

The response contains share metadata, the raw token, and public URL. The raw token is not returned by list operations and is stored only as a SHA-256 hash. Expiration must be in the future. Deleting a share sets its revocation timestamp. Public pages use `noindex`, `nofollow`, `noarchive`, and `no-store`; a public collection is limited to 500 items and reports when truncated.

## Status codes

| Status | Meaning                                                                |
| ------ | ---------------------------------------------------------------------- |
| `200`  | Successful read, update, delete, batch, export, or replay              |
| `201`  | Resource, import session, share, or restore created                    |
| `202`  | Metadata request accepted for asynchronous processing                  |
| `400`  | Invalid route value, query, relation, or JSON body                     |
| `401`  | Authentication required                                                |
| `404`  | Owned resource not found, including resources owned by another account |
| `409`  | Name conflict, duplicate link, or idempotency conflict                 |
| `415`  | Request body is not JSON                                               |
| `500`  | Safe generic server or database failure                                |
