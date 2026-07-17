# Contributing

Thanks for helping improve Pasted. Focused bug fixes, parser coverage, accessibility improvements, documentation, and well-scoped product changes are welcome.

## Before opening a change

- Search existing issues and pull requests for related work.
- Open an issue before a large architecture or product change so its scope can be agreed first.
- Report vulnerabilities privately using [SECURITY.md](SECURITY.md), not a public issue.
- Do not include personal chat exports, credentials, private URLs, production dumps, or real account data in a fixture, screenshot, log, or pull request.

Pasted is pre-1.0. Keeping a change small and explicit makes review and compatibility decisions easier.

## Development setup

Requirements:

- Node.js 24 or newer
- pnpm 11 or newer
- PostgreSQL 18, or a compatible PostgreSQL installation

```bash
git clone https://github.com/xtrafr/pasted.git
cd pasted
pnpm install
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` in `.env` to a random value of at least 32 characters. Start PostgreSQL, apply migrations, and run the app:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The local development server is at [http://localhost:5173](http://localhost:5173). On PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Run the metadata worker in another terminal when working on previews:

```bash
pnpm worker
```

## Quality checks

Run the checks relevant to your change while working, then run the complete local set before opening a pull request:

```bash
pnpm lint
pnpm check
pnpm test:unit
pnpm build
pnpm db:check
```

If your change affects a browser flow, also run:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

CI runs against PostgreSQL 18. It applies migrations, verifies the fake seed and worker heartbeat, runs static checks and unit tests, builds the application and Docker targets, and runs Playwright tests when browser test files are present.

## Tests

Tests should demonstrate useful behavior and a relevant failure mode. Prefer small public fixtures with clearly fictional data.

- Import parser tests live beside the parser in `src/lib/import`.
- Server unit tests live beside the service or policy they cover.
- API helper and query tests live under `src/routes/api/v1`.
- Browser scenarios should use `*.e2e.ts` so CI discovers them.
- Shared fixtures belong under `tests/fixtures`.

Never use a real `_chat.txt`. The repository ignores that filename at any depth. A WhatsApp fixture should use fake senders, example domains, invented dates, and no copied conversation text.

For a bug fix, add a test that fails before the fix whenever the behavior can be exercised without excessive coupling.

## Database changes

Edit the Drizzle schema in `src/lib/server/db`, then generate and inspect the migration:

```bash
pnpm db:generate
pnpm db:check
pnpm db:migrate
```

Commit the schema change, generated SQL, and Drizzle migration metadata together. Check ownership boundaries, delete behavior, useful indexes, and upgrade safety. Do not edit an existing released migration to represent a new change.

Schema relations between owned records should include `user_id` in the foreign key wherever practical. Services must still scope reads and writes by the current user.

## Adding an import parser

Read [docs/import-format.md](docs/import-format.md) before changing import behavior. A new parser must:

- implement the common `ImportParser` interface
- run in a browser Web Worker without Node.js-only dependencies
- honor byte, depth, row, column, string, and candidate limits where applicable
- avoid network access and executable HTML or code paths
- return limited review context rather than copying source content
- use the shared URL normalizer and secret masking pipeline
- have tests for malformed, Unicode, oversized, duplicate, dangerous scheme, and secret-bearing input
- extend client, server, and database format enums consistently

If a format contains personal communications, document exactly what crosses the server boundary.

## Security-sensitive changes

Changes to outbound requests, URL parsing, metadata, auth, sharing, imports, backups, HTML rendering, or logs need extra review.

For metadata networking:

- keep URL approval and the actual connection in the `safeFetchBuffer` path
- revalidate every redirect
- reject any DNS set containing a blocked address
- pin the connection to an approved IP and verify the socket peer
- do not forward cookies, authorization, referrers, or caller headers
- retain strict time, size, redirect, content type, and image signature limits
- add tests for private IPs, mixed DNS answers, redirect targets, ports, credentials, response types, and size limits

Describe any residual risk in [docs/security.md](docs/security.md). Application SSRF checks do not replace an operator's outbound firewall.

## UI changes

Use the tokens in `src/routes/layout.css` and the contracts in `design.md`. Reuse the existing UI primitives before adding another control implementation.

Every interactive change should preserve:

- visible labels and error messages
- keyboard access and visible focus
- Escape and focus containment for modal surfaces
- a minimum 44 by 44 pixel touch target where practical
- readable mobile layouts
- `prefers-reduced-motion` behavior
- semantic loading, progress, empty, and error states

Avoid raw HTML rendering for user or remote content. If rich text is necessary, propose the sanitizer and allowlist in the pull request.

## Documentation and writing

Update the relevant guide when behavior, configuration, routes, formats, or security controls change. Commands in documentation should work from the repository root.

Pasted does not use em dashes or en dashes in project-authored copy, comments, documentation, or commit messages. Check before submitting:

```bash
rg '\x{2014}|\x{2013}' . --glob '!node_modules/**' --glob '!pnpm-lock.yaml' --glob '!drizzle/meta/**'
```

Do not change generated or third-party text solely to satisfy this check.

## Commits and pull requests

Use short, natural commit subjects that state what changed, such as `cover bookmark imports with tests` or `fix metadata redirect validation`. Keep formatting-only changes separate from behavior when that helps review.

A pull request should include:

- the problem and chosen behavior
- the affected user or operator flow
- security and privacy impact, when relevant
- tests added or updated
- commands run and their results
- screenshots for visible desktop or mobile changes
- migration and rollback notes for schema changes

Keep unrelated cleanup out of the pull request. Review feedback may ask for smaller commits, additional ownership checks, or a narrower public interface.

## License

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).
