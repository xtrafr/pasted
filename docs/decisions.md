# Architecture decisions

This file records decisions that materially affect deployment, data ownership, and maintenance. It is intentionally short and should change when the implementation changes.

## PostgreSQL is the only supported database

Pasted targets PostgreSQL 18. Drizzle owns the checked-in SQL migrations, and the initial migration enables `pg_trgm` for search. A single database engine keeps ownership constraints, full-text search, transactions, and production behavior consistent between local and hosted environments.

SQLite compatibility is not a goal. Operators should test restores against the same PostgreSQL major version before an upgrade.

## The web process uses SvelteKit's Node adapter

The production artifact is the output of `@sveltejs/adapter-node`. The container runs it with Node.js 24 as an unprivileged user. Configuration is supplied at runtime, so one image can move between environments without rebuilding secrets into a layer.

## Authentication uses Better Auth

Email and password authentication is always available. GitHub login is optional and only activates when both OAuth variables are present. Session and rate-limit state live in PostgreSQL. Production requires an origin and a high-entropy authentication secret with at least 32 characters.

## Every user-owned query is ownership scoped

Items, link targets, collections, tags, imports, exports, shares, media, and API tokens carry a user identifier. Composite foreign keys prevent one user's child row from being attached to another user's parent row. Service methods keep the user identifier in every read and mutation path.

## Imports are reviewed before persistence

Parsing and normalization produce reviewable candidates before database writes. The importer limits file size and candidate count, detects duplicates, strips common tracking parameters, and masks likely secrets in review data. Private source files are not part of the repository or container context.

## Remote metadata fetching is treated as hostile input

Only HTTP and HTTPS URLs are accepted. DNS results and the connected address are checked against private and special-use networks. Redirects, response sizes, content types, and timeouts are bounded. Cookies and caller credentials are not forwarded. Image bytes are accepted only after type inspection, and SVG is rejected.

## PostgreSQL stores small fetched media

Favicons and preview images are stored as deduplicated byte arrays with content hashes. This keeps the first self-hosted release operational with one durable service. Account backups preserve permitted textual metadata but exclude these remote image bytes; restored targets are queued so the worker can fetch and validate fresh assets. If media volume grows, a later migration can move bytes to object storage while preserving asset identifiers and ownership rules.

## Migrations are a deployment gate

Compose starts a one-shot migration container and only starts the app and worker after that container succeeds. CI applies migrations to a clean PostgreSQL 18 service, runs the fake seed, and verifies a worker heartbeat. The initial schema creates the per-owner unique indexes required by composite foreign keys before adding those constraints, so dependency order is valid on a fresh database. Rollbacks use a database backup plus the previous application image because generated Drizzle migrations are forward-only operational changes.

## Background jobs run outside the web process

Metadata work runs through `pg-boss` in a standalone worker process. Keeping it separate prevents slow remote requests from consuming web capacity and lets operators restart or scale workers independently. The worker depends on completed schema migrations, records a PostgreSQL heartbeat, handles graceful shutdown, and has a health check tied to its exact worker identifier.

The worker image carries production dependencies, the TypeScript source graph, and the generated SvelteKit alias configuration. `tsx` is an explicit production dependency because the worker entry uses the same `$lib` paths as server modules. This is deliberate until a separately bundled worker artifact replaces runtime TypeScript execution.

## Demo data is opt-in and fictional

The seed creates a deterministic demo account, two collections, two links on reserved example domains, one note, and one reminder. It is idempotent and contains no copied personal data. Compose hides it behind the `demo` profile so a normal production start never creates credentials automatically.
