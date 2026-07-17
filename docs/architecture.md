# Architecture

Pasted is a SvelteKit application with two Node.js processes and PostgreSQL as its only required service. The web process owns interactive requests. A separate worker fetches remote metadata through a restricted network client. PostgreSQL stores application data, Better Auth records, search documents, and pg-boss jobs.

## Runtime map

```text
Browser
  | pages, form actions, session-cookie API calls
  v
SvelteKit web process
  | Drizzle queries             | pg-boss jobs
  v                             v
PostgreSQL <--------------- Metadata worker
                                  |
                                  | restricted HTTP and HTTPS
                                  v
                              Public websites
```

The production image uses `@sveltejs/adapter-node`. Docker Compose provides four normal services:

- `postgres`: PostgreSQL 18 with a persistent volume and `pg_isready` health check.
- `migrate`: a one-shot image target that applies Drizzle migrations.
- `app`: the built SvelteKit server on port 3000.
- `worker`: the pg-boss consumer for metadata and images.

The optional `seed` profile loads a fake demo account. The app and worker containers run as the `node` user with read-only roots, all Linux capabilities dropped, and a small writable `/tmp` mount.

## Source layout

| Path                          | Responsibility                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/routes`                  | SvelteKit pages, form actions, public share pages, and `/api/v1` handlers                         |
| `src/lib/components`          | Accessible UI primitives, application components, and landing sections                            |
| `src/lib/import`              | Browser-safe format detection, parsers, URL normalization, duplicate checks, and secret masking   |
| `src/lib/export`              | Format-independent selection, privacy filtering, serializers, backup validation, and ZIP handling |
| `src/lib/server/services`     | Owned content and taxonomy use cases                                                              |
| `src/lib/server/repositories` | Drizzle projections, search queries, pagination, and persistence helpers                          |
| `src/lib/server/imports`      | Import sessions, review state, batches, retries, cancellation, and idempotency                    |
| `src/lib/server/exports`      | Loads owned account data and builds downloadable artifacts                                        |
| `src/lib/server/jobs`         | Queue policy, metadata worker, heartbeats, retries, and per-host pacing                           |
| `src/lib/server/security`     | Remote URL approval and the pinned safe HTTP client                                               |
| `src/lib/server/metadata`     | Metadata HTML parsing and image type validation                                                   |
| `src/lib/server/sharing`      | Share token creation, revocation, and public projections                                          |
| `src/lib/server/db`           | Drizzle schema, connection pool, and auth tables                                                  |
| `drizzle`                     | Generated SQL migrations and migration metadata                                                   |

Svelte components do not query the database directly. Page server modules and API handlers call services, services validate input and enforce ownership, and repositories perform database operations.

## Request lifecycle

`src/hooks.server.ts` asks Better Auth for a session only when a session cookie is present. It stores the resolved user and session in `event.locals`, then delegates to the Better Auth SvelteKit handler. Authenticated layouts redirect guests to sign-in and prevent authenticated users from returning to the auth screens.

The JSON API uses the same session cookie as the web interface. `authenticatedApi` rejects a missing user before running a service. Successful JSON responses use this envelope:

```json
{
	"ok": true,
	"data": {}
}
```

The response mapper removes internal `userId` fields recursively. Errors use a stable code and safe message. Server errors are logged without returning database details to the client. Binary exports and metadata assets return direct response bodies with `nosniff` and explicit content types.

## Ownership boundary

Every content service requires a non-empty user ID. Reads, updates, and deletes include the user ID in their conditions. Cross-entity writes validate that collections and tags belong to the same owner.

The database reinforces this rule with per-user unique indexes and composite foreign keys such as `(user_id, collection_id)` to `(collections.user_id, collections.id)`. This prevents a service mistake from attaching an item to another account's collection. Deleting an account cascades through owned data. Deleting a collection first moves its items to the unorganized state, then deletes the collection.

Public shares are the deliberate exception to session authentication. A share resolution query uses the owner stored on the share and returns a narrow, read-only projection. It does not include personal link notes, tags, collection IDs, archive state, favorites, user data, or internal metadata asset IDs.

## Data model

`items` contains fields shared by links, notes, and reminders. Type-specific tables use the item ID as their primary key:

- `links` keeps the original URL and personal import fields.
- `link_targets` deduplicates normalized URLs per account and stores fetched metadata state.
- `notes` keeps the Markdown body.
- `reminders` keeps due time, time zone, recurrence text, completion state, and notification timestamps.

`collections` and `tags` are owner-scoped taxonomy. `item_tags` is the many-to-many relation. A null collection means unorganized.

Import work is represented by `import_sessions` and `import_results`. Candidate keys and session idempotency keys make repeated client requests safe. `media_assets` stores fetched favicons and preview images by owner and SHA-256 digest. `shares` stores only a hash of each public token. The schema also contains `export_jobs` and `api_tokens` for future asynchronous exports and public token authentication, but current exports are synchronous and `/api/v1` uses sessions.

Better Auth owns `user`, `session`, `account`, `verification`, and `rate_limit`. The queue owns its pg-boss schema. `worker_heartbeats` is an application table used by container and CI health checks.

## Authenticated application shell

The authenticated layout loads the owner's collections and tags for shared navigation and creation controls. Quick Add and the command palette are mounted by that layout, so they remain available on the library, import, export, security, and organization screens. Keyboard commands open those controls or navigate to common views without coupling them to the dashboard page.

The organization screen reads the same owner-scoped collection and tag services. It creates, edits, and deletes both kinds of taxonomy through `/api/v1`, shows current item counts, and exposes supported collection descriptions, colors, icons, and sort modes. Deleting a collection moves its items to unorganized; deleting a tag removes only its item relations.

The dashboard loads up to 20 pending reminders whose due time has passed. It always presents those reminders in an in-app notice. With explicit browser permission, the client also creates system notifications while Pasted is open and keeps a bounded local record keyed by reminder ID and due time to avoid repeating the same alert on that device.

## Import pipeline

The browser reads the selected file as text and sends it to `src/lib/import/worker.ts`. The worker applies an input byte limit, chooses a parser, extracts candidates, normalizes URLs, detects duplicates, and masks likely secrets. For CSV and TSV, the browser first inspects the initial row, displays header or numbered column labels, and passes the selected zero-based columns into the parser when analysis runs again. No network requests are made during analysis.

For normal link imports, only sanitized candidate fields and review settings cross the server boundary. The server normalizes each URL again, compares it with existing account targets, and stores an import plan. Batch requests create selected links in transactions. A batch is limited to 100 candidates, and idempotency keys prevent double-click duplication. A full account restore sends the validated backup object to the authenticated restore endpoint. Metadata jobs are queued after link creation and do not block the import.

See [the import format guide](import-format.md) for parser contracts and exact limits.

## Metadata pipeline

Link creation produces or reuses a per-user `link_target` and automatically queues metadata after the content transaction commits. Import batches do the same for each unique target. The authenticated API exposes status and manual refresh controls. pg-boss provides PostgreSQL-backed delivery, bounded retries, job expiry, per-target singleton keys, and host grouping.

The worker runs at local concurrency 4. `HostRateGate` reserves requests to the same hostname at least 750 milliseconds apart. HTML is limited to 1 MiB. Favicons are limited to 256 KiB and preview images to 2 MiB. The worker parses text fields without executing remote JavaScript, validates image magic bytes, stores accepted bytes, and refreshes affected search documents.

While a dashboard card has `pending` or `fetching` metadata, it polls the authenticated status endpoint for a bounded number of attempts. Ready responses progressively replace fallback text and expose owner-checked asset URLs for lazy preview images and favicons. A failed or blocked state stops polling and remains visible without exposing the remote URL or worker internals.

Security policy failures become terminal `blocked` states. Transient failures use up to three retries with bounded exponential delays. Ready metadata is considered fresh for six hours unless a caller explicitly forces refresh.

The full outbound policy and residual risks are documented in [Security](security.md).

## Search and pagination

Each item has a PostgreSQL `tsvector` built from owned item content, URL metadata, tag names, and collection names. Searches use `websearch_to_tsquery('simple', query)` and a GIN index. The migration also enables `pg_trgm` and adds trigram indexes for title, normalized URL, and domain support.

List endpoints support combinations of type, state, reminder state, source import session, collection, tags, domain, favorite, archive, and date filters. The source import filter joins through link details and lets the post-import screen show only links created by a specific owned session. Sort values use a stable item ID tie-breaker. The opaque cursor records the current sort value and item ID, so the next page does not depend on offset scans.

## Exports and backups

The server loads owned items in pages and caps an account export at 100,000 items. Shared selection logic applies scope filters first, then privacy exclusions. In addition to account and filter scopes, the dashboard can pass explicit selected item IDs, and search scope reruns the owned full-text query for up to 10,000 non-archived matches. Serializers produce Pasted JSON, simple JSON, CSV, TXT, Markdown, Netscape bookmarks, or ZIP.

Pasted backup version 1 carries taxonomy, relations, all item variants, reminder fields, and permitted textual link metadata. JSON and ZIP readers enforce compressed, decoded, and item-count limits. Strict structured validators reject unknown object fields and check field types and bounds, UUIDs and uniqueness, references, manifest counts, HTTP or HTTPS URLs, colors, icons, IANA time zones, ISO timestamps, and filter date ordering before returning a typed value. The import UI validates JSON or ZIP input before sending the structured backup to the server, which validates the structured object again. Restore runs in one transaction, maps taxonomy IDs, creates all item variants, refreshes search documents, and records an idempotent import session.

Backup archives intentionally omit remote favicon and preview image bytes. Restore marks link metadata pending and queues every restored target after the transaction commits. The metadata worker then fetches fresh text and image assets through the same SSRF and image validation boundary used for newly saved links.

## Design system

`design.md` is the canonical visual source. `src/routes/layout.css` translates its palette, typography, spacing, focus, shape, and motion rules into tokens. The interface uses a bone white canvas, black ink, and one highlighter green accent. Reusable controls own labels, errors, focus behavior, and disabled or loading states. Reduced motion removes nonessential transitions without changing information or controls.

## Testing and CI

Vitest covers import parsing, normalization, secrets, export formats, backup validation, API response helpers, query parsing, import planning, metadata parsing, SSRF rules, queue policy, and sharing. Playwright covers account separation and backup round trips at the integration boundary, the authenticated import to export library flow in desktop Chromium, and phone viewport navigation.

The CI workflow uses Node.js 24, pnpm, and PostgreSQL 18. It checks migration consistency, applies migrations to a clean database, verifies the seed and worker heartbeat, runs formatting, lint, Svelte and TypeScript checks, unit tests, and a production build. It also builds the migrate, worker, and runner container targets. The initial migration creates the supporting per-owner unique indexes before adding composite foreign keys, which keeps a fresh PostgreSQL install in valid dependency order.
