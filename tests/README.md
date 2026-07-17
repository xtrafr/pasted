# Pasted browser and integration tests

The Playwright suite uses only generated accounts and the public fixture at
`tests/fixtures/import/fake-whatsapp.txt`. It never reads a personal chat export.

Set `TEST_DATABASE_URL` to keep test data separate from development data. If that variable is not
set, the suite uses `DATABASE_URL`, then the documented local PostgreSQL URL. Apply migrations before
running the suite:

```sh
pnpm db:migrate
pnpm test:e2e
```

Each database-backed suite probes PostgreSQL and the Pasted schema before setup. It is reported as
skipped with an actionable reason when either is unavailable. Test accounts have a `pw_` prefix and
are deleted through the user cascade during teardown, including sessions and all owned content.

Playwright keeps screenshots and traces only for failed tests. The CI browser job supplies PostgreSQL,
applies migrations, installs Chromium, and runs the same command.
