# Self-hosting Pasted

The supported self-hosted shape is one Pasted web container, one metadata worker, and PostgreSQL 18. The included Compose project runs migrations before either application process and keeps PostgreSQL off the host network. Its named volume mounts at `/var/lib/postgresql`, which is the storage layout required by the official PostgreSQL 18 image.

## Requirements

- Docker Engine with the Compose plugin and BuildKit
- A host with persistent disk for the PostgreSQL volume
- A public HTTPS reverse proxy for internet-facing installations
- A database backup destination outside the Docker host

The app and worker images use Node.js 24, run as the unprivileged `node` user, have read-only root filesystems, drop Linux capabilities, and only receive secrets at runtime.

## Configure

Copy `.env.example` to `.env` and replace every development value. At minimum, set:

```dotenv
DATABASE_URL=postgres://pasted:use-a-long-database-password@postgres:5432/pasted
POSTGRES_DB=pasted
POSTGRES_USER=pasted
POSTGRES_PASSWORD=use-a-long-database-password
ORIGIN=https://links.example.net
BODY_SIZE_LIMIT=64M
BETTER_AUTH_SECRET=replace-with-at-least-32-high-entropy-characters
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=3000
TRUSTED_PROXY_IPS=127.0.0.1
WORKER_ID=metadata-worker-1
```

`DATABASE_URL` and the three `POSTGRES_*` values must describe the same database. Percent-encode reserved characters in the URL password. `BODY_SIZE_LIMIT` must remain at least 64 MB if users need to restore the supported 50 MB JSON backups. Generate the authentication secret with a cryptographically secure password manager or secret generator. `APP_BIND_ADDRESS` defaults to `127.0.0.1` so the published app port is reachable only from the Docker host. Do not commit `.env`.

GitHub login is optional. Set both `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, then configure the provider callback for your public origin. Leave both empty to keep only email and password login.

## Start

Build and start the database, migration gate, app, and worker:

```sh
docker compose up --build -d
docker compose ps
docker compose logs migrate
docker compose logs app worker
```

The app is available on `APP_PORT`, which defaults to port 3000, at `APP_BIND_ADDRESS`, which defaults to `127.0.0.1`. Its health check requests `/api/health`, which verifies a database query without exposing database details. PostgreSQL has its own `pg_isready` check. The worker health check verifies that its exact `WORKER_ID` has written a recent database heartbeat. Neither application process can start until migrations complete successfully.

Put an HTTPS reverse proxy in front of the app. Keep the app bound to loopback or another network that clients cannot reach directly. `ORIGIN` must exactly match the browser-facing origin. Better Auth uses this fixed value and does not trust forwarded host or protocol headers.

The proxy must replace any inbound `X-Forwarded-For` header with a value it constructs from its own connection data. Never append to an untrusted client-provided value. Set `TRUSTED_PROXY_IPS` to a comma-separated list of the exact reverse proxy IP addresses or CIDR ranges. When several trusted proxies are present, Better Auth walks the forwarded chain from right to left and uses the first address outside that list as the client identity for authentication rate limits. Avoid broad private ranges that could also include clients.

For example, a single Nginx proxy should use `$remote_addr` rather than `$proxy_add_x_forwarded_for`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

If the reverse proxy runs in another container, bind the app only to a private network shared with that proxy instead of publishing it publicly. Use the proxy address visible in the trusted forwarded chain, not an arbitrary private subnet.

## Optional fake demo account

The normal deployment never seeds credentials. For a disposable evaluation environment, set `DEMO_USER_EMAIL` and a password with at least 12 characters, then run:

```sh
docker compose --profile demo run --rm seed
```

The seed is idempotent and uses only fictional content on reserved example domains. Change or remove the account before exposing the service. Do not use the documented default password on an internet-facing host.

## Migrations and upgrades

Before upgrading:

1. Read release notes and inspect new SQL migrations.
2. Create and verify a database backup.
3. Pull the exact source revision or image tag you intend to run.
4. Rebuild and run the migration service.
5. Start the app and worker, then inspect their health and logs.

With the included source build:

```sh
docker compose build --pull
docker compose run --rm migrate
docker compose up -d app worker
```

The migration journal makes completed migrations idempotent. Do not run `db:push` against production. For a failed schema rollout, stop writes, restore the pre-upgrade database backup, and run the previous application revision.

## Backups and restores

Create a compressed logical backup outside the container volume:

```sh
docker compose exec -T postgres pg_dump -U pasted -d pasted -Fc > pasted.dump
```

Test restores regularly in an isolated database. A typical restore starts with an empty PostgreSQL 18 database:

```sh
docker compose exec -T postgres createdb -U pasted pasted_restore
docker compose exec -T postgres pg_restore -U pasted -d pasted_restore --clean --if-exists < pasted.dump
```

The persistent volume contains the live database but is not a backup. Keep encrypted copies off-host, define retention, and test a full recovery procedure.

## Operations

Useful commands:

```sh
docker compose ps
docker compose logs -f --tail=200 app worker postgres
docker compose restart app
docker compose restart worker
docker compose run --rm migrate
docker compose down
```

Avoid `docker compose down -v` unless you intentionally want to delete the database volume. Set memory, CPU, log rotation, and alerting limits appropriate to your host. Monitor free disk space, PostgreSQL connection pressure, migration failures, app and worker restarts, stale worker heartbeats, queue depth, and health-check failures.

Each worker replica needs a unique `WORKER_ID`. The Compose default is `metadata-worker-1`. Give additional replicas stable identifiers and confirm their heartbeat rows before relying on asynchronous metadata jobs.

## Security checklist

- Terminate HTTPS and enable HSTS at the reverse proxy.
- Keep the application origin inaccessible to clients and overwrite `X-Forwarded-For` at the proxy.
- Use unique database and authentication secrets.
- Keep the database on the private Compose network.
- Apply operating system, Docker, Node image, and PostgreSQL updates.
- Restrict access to logs and backups because URLs and account identifiers can be sensitive.
- Never mount private import files into the app container.
- Review OAuth callback URLs after changing the public origin.
- Rotate secrets after suspected exposure. Rotating `BETTER_AUTH_SECRET` invalidates active sessions.
