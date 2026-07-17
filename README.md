# Pasted

Pasted keeps links, notes, and reminders in one private library. Drop in a messy text file, review the links it finds, and leave the rest behind.

[![CI](https://github.com/xtrafr/pasted/actions/workflows/ci.yml/badge.svg)](https://github.com/xtrafr/pasted/actions/workflows/ci.yml)

![Short Pasted product demo](docs/assets/pasted-demo.gif)

![Pasted dashboard](docs/assets/dashboard.png)

Pasted is a self-hosted SvelteKit application backed by PostgreSQL. It includes an authenticated dashboard, a browser-side import pipeline, versioned exports, revocable sharing, and an isolated metadata worker.

## What works

- Save links, Markdown notes, and scheduled reminders.
- Organize items with collections, tags, favorites, and archives, with a dedicated screen for creating, editing, and deleting collections and tags.
- Open Quick Add or the keyboard-driven command palette from every authenticated screen.
- Search titles, URLs, domains, descriptions, notes, tags, and collections.
- Filter and sort the library, switch between cards and a compact list, and apply bulk actions.
- Parse text, WhatsApp exports, nested JSON, selected CSV or TSV columns, Markdown, HTML, and Netscape bookmark files.
- Review candidates before import, detect duplicates, mask likely secrets, and import in idempotent batches.
- Fetch link metadata asynchronously with DNS and IP checks, pinned connections, redirect validation, size limits, and per-host pacing. Cards progressively show status, fetched titles, favicons, and previews.
- Surface due reminders in the app and optionally send browser notifications while Pasted is open.
- Export all, current search results, a manual selection, or another supported scope as Pasted JSON, simple JSON, CSV, TXT, Markdown, browser bookmarks, or a ZIP backup.
- Share one item or collection with a revocable, optional-expiry URL.
- Run the web process, metadata worker, migrations, and PostgreSQL with Docker Compose.

Pasted is pre-1.0. The API and backup schema are versioned where practical, but compatibility may still change before the first stable release.

## Importing

Normal link-import analysis runs in a Web Worker when the browser supports it. The source file stays in the browser. The server receives only the reviewed URL candidates and their selected import settings, not the original file or chat text. A full account restore is the explicit exception: the validated Pasted backup object is sent to the authenticated server because it contains the account data being restored.

| Input                | Detection and extraction                                      |
| -------------------- | ------------------------------------------------------------- |
| Text and pasted text | HTTP, HTTPS, and high-confidence bare domains                 |
| WhatsApp text export | Links only, with an optional message date                     |
| JSON                 | Strings in nested objects and arrays                          |
| CSV and TSV          | Choose columns, including quoted multiline values             |
| Markdown             | Inline links, reference links, autolinks, and plain URLs      |
| HTML                 | Anchor targets and visible text, with active elements ignored |
| Browser bookmarks    | Netscape bookmark links, folder paths, and dates              |
| Pasted JSON and ZIP  | Validate and restore complete account data in one transaction |

See [the import format guide](docs/import-format.md) for normalization, limits, privacy behavior, and the parser interface.

## Exporting

Exports can cover the full account, one collection, one domain, favorites, reminders, a date range, the current full-text search, or an explicit dashboard selection. Privacy controls can omit personal link notes, source dates, fetched metadata, note bodies, and reminder descriptions.

The Pasted backup format is versioned and preserves collections, tags, relations, links, notes, reminders, and textual metadata. ZIP backups contain `pasted-backup.json` plus a data-free `README.txt`. The browser enforces file and decoded-data limits, while the browser and server both apply strict shape, type, identifier, reference, date, cardinality, and field-bound validation. Restore then writes the complete account data in one transaction with idempotency protection. Favicon and preview image bytes are not embedded in backups; metadata and its validated image assets are fetched again after restore.

## Quick start

Requirements:

- Node.js 24 or newer
- pnpm 11 or newer
- PostgreSQL 18, or a compatible supported PostgreSQL installation

```bash
git clone https://github.com/xtrafr/pasted.git
cd pasted
pnpm install
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` in `.env` to a random value of at least 32 characters, then start PostgreSQL and prepare the schema:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The seed defaults to `demo@example.com` with password `demo-password-change-me`. Change that password immediately outside a local evaluation environment.

Run `pnpm worker` in another terminal to process link metadata during local development.

On PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Docker

Create `.env`, set a strong `BETTER_AUTH_SECRET`, then build and start the complete stack:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app worker
```

The application is served at [http://localhost:3000](http://localhost:3000). Compose starts PostgreSQL, runs migrations once, then starts separate application and metadata worker containers. The containers run as an unprivileged user with a read-only root filesystem, dropped Linux capabilities, and health checks.

To load the fake demo account:

```bash
docker compose --profile demo run --rm seed
```

Production setup, upgrades, backups, and reverse proxy notes are in [the self-hosting guide](docs/self-hosting.md).

## Configuration

| Variable               | Required    | Purpose                                                     |
| ---------------------- | ----------- | ----------------------------------------------------------- |
| `DATABASE_URL`         | Production  | PostgreSQL connection string                                |
| `DATABASE_POOL_SIZE`   | No          | Web process pool size, default `10`                         |
| `BODY_SIZE_LIMIT`      | No          | Adapter request cap, default `64M` in Compose               |
| `ORIGIN`               | Production  | Public application origin, with scheme and port when needed |
| `BETTER_AUTH_SECRET`   | Production  | High-entropy Better Auth secret, at least 32 characters     |
| `GITHUB_CLIENT_ID`     | No          | Enables GitHub sign-in when paired with the client secret   |
| `GITHUB_CLIENT_SECRET` | No          | GitHub OAuth client secret                                  |
| `LOG_LEVEL`            | No          | Pino log level, default `info`                              |
| `WORKER_ID`            | No          | Stable metadata worker identity and health check key        |
| `APP_PORT`             | Docker only | Host port mapped to the application, default `3000`         |
| `DEMO_USER_EMAIL`      | Seed only   | Demo account email, default `demo@example.com`              |
| `DEMO_USER_PASSWORD`   | Seed only   | Demo password, minimum 12 characters                        |

The local fallback secret is for development only. Production startup rejects a missing database URL, origin, or sufficiently long auth secret.

## Development

```bash
pnpm dev
pnpm lint
pnpm check
pnpm test:unit
pnpm build
```

Useful database and worker commands:

```bash
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm db:studio
pnpm worker
```

`pnpm test:e2e` runs the database integration suite plus desktop and mobile Playwright flows. Apply migrations first and use `TEST_DATABASE_URL` to keep test data separate. See [the test guide](tests/README.md). CI also verifies migrations, the seed, the worker heartbeat, all Docker build targets, and the production build.

## Architecture

The application uses SvelteKit 2 and Svelte 5 with strict TypeScript, Drizzle ORM, Better Auth, PostgreSQL, pg-boss, Tailwind CSS 4, Vitest, and Playwright.

The web process handles pages, sessions, owned CRUD services, import sessions, exports, sharing, due-reminder presentation, and the internal `/api/v1` routes. The worker consumes metadata jobs from PostgreSQL, applies outbound request policy, and stores sanitized metadata and validated image bytes. Authenticated cards poll bounded metadata status routes while work is pending, then render owner-checked assets. Every content query is scoped to the authenticated user, with composite ownership constraints in the database.

Read [the architecture guide](docs/architecture.md), [API reference](docs/api.md), and [technical decisions](docs/decisions.md) for details.

## Security and privacy

- Items are private by default and ownership is enforced in services and database relations.
- Email/password authentication uses rate limits stored in PostgreSQL. GitHub OAuth is optional.
- Import files are analyzed in the browser and are not retained by the server.
- Likely credentials, sensitive query parameters, and common token shapes are flagged and masked during review.
- Metadata requests accept only HTTP and HTTPS on ports 80 and 443. Every DNS result and redirect target is checked before a connection is pinned to an approved public IP.
- Remote HTML is parsed as data. JavaScript is never executed, response sizes and types are bounded, and remote images are verified by file signature.
- Application and worker logs redact URL and secret-bearing fields.
- Public share tokens contain 256 bits of randomness. Only their SHA-256 hashes are stored.

No application-level SSRF filter replaces network egress controls. Operators should still restrict the worker network and monitor outbound traffic. Read [the security design](docs/security.md) and [security policy](SECURITY.md) before exposing an instance to the internet.

## Screenshots

| Landing                                         | Import review                                          |
| ----------------------------------------------- | ------------------------------------------------------ |
| ![Pasted landing page](docs/assets/landing.png) | ![Pasted import review](docs/assets/import-review.png) |

| Reminders                                      | Mobile                                             |
| ---------------------------------------------- | -------------------------------------------------- |
| ![Pasted reminders](docs/assets/reminders.png) | ![Pasted mobile dashboard](docs/assets/mobile.png) |

## Roadmap

- Add a conflict preview and dry-run summary for large backup restores.
- Add selective merge policies for restoring into an established library.
- Add recovery email delivery for self-hosters that configure a mail provider.
- Stabilize a separately authenticated public API before enabling the existing token data model.

## Contributing

Issues and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), run the local quality commands, and include tests for behavior changes.

## License

Pasted is available under the [MIT License](LICENSE).

## Acknowledgements

[Pastefy](https://github.com/interaapps/pastefy) informed some early thinking about self-hosted content storage, accounts, folders, sharing, APIs, and Docker packaging. Pastefy is MIT licensed. Pasted is an independent project with its own codebase and product design, and is not affiliated with or endorsed by Pastefy or its maintainers.
