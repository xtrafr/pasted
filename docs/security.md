# Security design

Pasted stores private user content and fetches metadata from user-supplied URLs. Its main trust boundaries are the browser import parser, authenticated application services, PostgreSQL, the metadata queue, and the worker's outbound network.

This document describes implemented controls and their limits. It is not a security certification. See the repository [security policy](../SECURITY.md) to report a vulnerability.

## Security properties

- Account data is private unless its owner creates an explicit share.
- Services and queries scope content by authenticated user ID.
- Composite database constraints prevent cross-owner collection, tag, item, media, and link-target relations.
- Import source files are normally processed in the browser and are not uploaded.
- Metadata fetching allows only constrained HTTP and HTTPS requests to addresses classified as public.
- Remote HTML is parsed as data and remote JavaScript is never executed.
- Public share tokens have 256 bits of randomness and only their SHA-256 hashes are stored.
- Logs and API errors are designed to avoid secrets, URLs, file contents, and database detail.

## Authentication and sessions

Better Auth provides email/password sessions and optional GitHub OAuth. Passwords must contain 12 to 128 characters. Sessions expire after 30 days and have a one-day update age. Changing or resetting a password can revoke sessions according to the Better Auth configuration.

Authentication rate limits are stored in PostgreSQL:

| Operation              | Limit                      |
| ---------------------- | -------------------------- |
| General auth traffic   | 60 requests per 60 seconds |
| Email sign-in          | 8 requests per 60 seconds  |
| Email registration     | 5 requests per 5 minutes   |
| Password reset request | 3 requests per 5 minutes   |

The configured `ORIGIN` is the only trusted origin passed to Better Auth. `/api/v1` uses the same session cookie as the web interface and does not add permissive CORS headers. SvelteKit form and origin handling and Better Auth's cookie policy provide the framework-level CSRF boundary. Deploy the application on HTTPS and set `ORIGIN` to the exact public origin so production cookie and origin checks receive correct values.

Production startup requires `DATABASE_URL`, `ORIGIN`, and a `BETTER_AUTH_SECRET` of at least 32 characters. Generate the secret with a cryptographically secure tool. Do not use the local fallback secret in any shared environment.

GitHub OAuth is disabled unless both client variables are present. No external identity provider is required for email/password accounts.

## Data isolation

Every service calls `requireUserId` or the equivalent scoped helper before accessing content. Queries combine the resource ID with the owner ID. A resource owned by another account is reported as not found instead of revealing its existence.

The schema adds composite owner foreign keys on relations. For example, an item can reference only a collection with the same `user_id`, and link metadata assets can reference only assets owned by the same account. Tag replacement validates the complete requested tag set before writing. Bulk operations verify ownership of all item IDs before applying changes.

Database credentials remain a high-value boundary. A database administrator can read content, session records, password hashes, stored metadata, and hashed share tokens. Use a dedicated database role, encrypted backups, restricted network access, and normal PostgreSQL patching and monitoring.

## Import security and privacy

The link parser runs in a Web Worker when available. It has no server imports and makes no network requests. The fallback executes the same parser in the browser thread.

The import pipeline enforces limits before or during parsing:

- 10 MiB input text
- 10,000 candidates
- 8,192 characters per URL
- JSON depth 64 and 100,000 visited values
- 1 MiB per JSON string or CSV cell
- 50,000 CSV rows and 250 columns
- 100 candidates per server import batch

JSON depth is scanned before `JSON.parse`, then traversal uses an explicit stack. CSV uses a bounded custom parser and rejects unterminated quoted fields. HTML parsing removes active `script`, `style`, `template`, and `noscript` regions and never creates an executable DOM. None of the import adapters process XML, so entity expansion and XML external entity attacks are outside this code path.

URL normalization accepts only HTTP and HTTPS. Dangerous and unsupported schemes remain visible as invalid review candidates, not navigable saved links. Candidate text is rendered through normal Svelte interpolation rather than raw HTML.

The browser detects common credentials, sensitive query names, token patterns, JWTs, and webhook paths. It sends categories and masked text to the interface. Detection is heuristic. It reduces accidental exposure but does not prove that a URL is secret-free.

For normal link imports, the server receives selected URL candidates, optional titles and dates, taxonomy choices, and idempotency keys. It does not receive or retain the original file, complete chat messages, sender names, source excerpts, or filenames. Import logs must never add those fields.

Backup restore is different because its purpose is to restore account data. The selected Pasted backup object is sent to the server, validated, and written inside one database transaction. The restore uses cardinality and relationship validation and an idempotency key. Operators should treat backup files as sensitive account exports and protect them at rest and in transit.

## SSRF defense for metadata

Metadata work runs in a separate process so imports and normal page requests do not wait on arbitrary remote servers. The safe request path is implemented by `approveRemoteUrl` and `safeFetchBuffer`.

### URL policy

Before every network hop, Pasted:

1. Parses the URL with the platform URL parser.
2. Allows only `http:` and `https:`.
3. Rejects a username or password in the URL.
4. Allows only port 80 for HTTP and 443 for HTTPS. An omitted default port is accepted.
5. Rejects empty or oversized hostnames and names ending in `.localhost`, `.local`, `.internal`, `.home`, `.lan`, `.test`, `.invalid`, `.example`, or `.onion`.
6. Resolves all A and AAAA results, or validates a literal IP directly.
7. Normalizes IPv4, IPv6, zone suffixes, and IPv4-mapped IPv6 forms.
8. Rejects the entire hostname if any result is not a public unicast address.

The IP rule blocks loopback, private, link-local, unique-local, unspecified, multicast, broadcast, reserved, and IPv4-mapped variants. This includes common cloud metadata addresses such as `169.254.169.254`. Internal metadata hostnames are also blocked by suffix or by their resolved address.

Rejecting a mixed public and private DNS answer is intentional. Selecting only the public result would leave the hostname usable in later rebinding or failover behavior.

### Connection pinning

After approval, the Undici connector connects to the first approved address directly instead of resolving the hostname again. HTTPS keeps the original hostname as the TLS server name. Once connected, Pasted compares the socket's actual remote address with the approved address and destroys the socket if it changed.

This closes the normal DNS rebinding gap between validation and connection. HTTP/2, pipelining, connection reuse, and TLS session caching are disabled for this single-use client.

### Redirect policy

Redirects are handled manually for status 301, 302, 303, 307, and 308. Relative locations are resolved against the current approved URL. Every new target goes through the complete URL, hostname, DNS, IP, port, and pinned-connection policy before the next request. At most three redirects are followed, and a redirect without `Location` is rejected.

A public first hop therefore cannot redirect the worker to localhost, a private network, a cloud metadata IP, or a disallowed port.

### Request policy

The worker sends a fixed, identifiable user agent:

```text
Pasted/0.1 (+https://github.com/xtrafr/pasted)
```

It sends no browser cookies, authorization header, referrer, or user-supplied headers. `Accept-Encoding: identity` prevents decompression bombs and compressed responses are rejected. Headers are limited to 16 KiB. Connection setup has a 3-second timeout and each hop has an 8-second request timeout.

HTML responses must declare `text/html` or `application/xhtml+xml` and are limited to 1 MiB. Favicon responses are limited to 256 KiB and previews to 2 MiB. Bodies are counted while streaming and a declared oversized `Content-Length` is rejected.

Images must declare an image content type and also pass file signature detection. Accepted formats are PNG, JPEG, WebP, GIF, AVIF, and common ICO variants. SVG is not accepted. This prevents an HTML or script body from being stored merely because its header claims to be an image.

### Parsing and persistence

Metadata HTML is parsed with `htmlparser2`. Pasted reads the document title, description, Open Graph or Twitter title and image, site name, and favicon relation. It does not execute scripts, load subresources, apply CSS, or render the document.

Text control characters are removed, whitespace is collapsed, and fields are truncated before storage. Asset URLs must independently be HTTP or HTTPS without URL credentials and later pass the complete safe request policy. Stored image bytes are deduplicated by SHA-256 within the account and served through an authenticated, `nosniff` endpoint.

### Queue controls

pg-boss limits retries to three with bounded exponential delay. Jobs expire after 45 seconds. Per-target singleton keys suppress rapid duplicates. Jobs are grouped by a SHA-256-derived hostname key, and each worker process reserves at least 750 milliseconds between requests to the same host. Ready metadata is considered fresh for six hours unless a user forces refresh.

Security policy failures, unexpected content, oversized responses, and remote address changes become terminal blocked states instead of retry loops. Worker logs include target IDs and safe failure codes but redact URLs, tokens, normalized URLs, and hostnames.

## SSRF residual risk

The application controls the URL and connection path it opens, but no application filter can prove what a public server does behind its own boundary. Important residual risks include:

- A public server can operate as a proxy and return content it fetched from a private network. Pasted sees only the approved public peer.
- NAT, transparent proxies, service meshes, custom DNS resolvers, or unusual host networking can change the meaning of an approved address. Container and host egress rules remain necessary.
- DNS lookup occurs before the per-hop request abort timer. A faulty resolver can delay a job until the pg-boss job expiry or process-level network timeout intervenes.
- Only the first approved public DNS result is used. This is conservative but reduces availability for hosts whose first address is unreachable.
- Size, concurrency, and time limits reduce resource exhaustion but do not eliminate cost from many distinct slow public hosts.
- The 750-millisecond host gate is held in worker process memory. Queue grouping also serializes a host group, but operators should reassess aggregate rate when scaling worker replicas.
- IP classification depends on `ipaddr.js`, Node.js DNS behavior, Undici, and the host network stack. Keep these dependencies and the Node.js runtime updated.
- Future code that bypasses `safeFetchBuffer`, renders stored metadata as raw HTML, or forwards request headers can invalidate these protections.

For internet-facing installations, place the worker on an outbound network policy that denies loopback, RFC 1918, link-local, unique-local, cluster, control-plane, and cloud metadata destinations independently of application checks. Permit only required DNS and public TCP ports 80 and 443. Monitor denial logs and unexpected outbound volume.

## Stored XSS and link safety

Application and public share views render user content and remote metadata as escaped Svelte text. Note bodies are displayed as text with preserved whitespace; they are not injected as HTML. Metadata parsing returns text and URL strings only. No route uses a raw HTML rendering directive for imported content.

Saved link URLs have passed HTTP or HTTPS normalization. Public share links open in a new tab with `noopener`, `noreferrer`, and `no-referrer`. Continue using these rules when adding Markdown rendering, rich previews, or new public surfaces. If rich Markdown is added, use a maintained sanitizer with an explicit element and attribute allowlist.

## Sharing

A share token is 32 random bytes encoded as a 43-character base64url value. The database stores its SHA-256 digest, never the raw token. Creation returns the token once in the public URL. A share targets exactly one owned item or collection and can have a future expiration. Revocation records a timestamp and resolution accepts only non-revoked, non-expired rows.

Public pages set `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, and `X-Content-Type-Options: nosniff`. Their data projection intentionally omits owner identity, personal link notes, taxonomy IDs and names outside the shared collection header, favorite and archive state, and internal media references. Public collection output is limited to 500 items.

Share URLs are bearer secrets. Browser history, chat applications, access logs, and referrer behavior can expose them. Expire and revoke links when no longer needed. The current public page avoids loading preview assets and sets no-referrer on outbound links.

## Exports and backups

Exports contain sensitive account data by default. The export screen can omit personal link notes, source dates, fetched metadata, note bodies, and reminder descriptions. Download responses use `no-store` and `nosniff`.

CSV serialization quotes cells and prefixes formula-leading values to reduce spreadsheet formula injection. This protection should remain enabled unless the caller understands the destination. HTML bookmark exports escape titles and URLs.

Structured backup validation is strict on both the browser and server. It rejects unknown object fields and checks the versioned type shape, field lengths, enum values, UUID shape and uniqueness, references, timestamps, URLs, domains, colors, icons, IANA time zones, counts, and relation cardinality. Browser-side JSON and ZIP reading enforces file, decoded-data, and compressed or uncompressed limits and extracts only the expected JSON and README names. A valid backup can still contain private or malicious-looking plain text, so normal escaped rendering and URL policy remain required after restore.

Pasted backups do not embed remote favicon or preview image bytes. Restore keeps permitted textual metadata, returns targets to the pending state, and queues fresh metadata work only after the database transaction commits. The worker re-fetches text and image bytes through the complete outbound and file-signature policy before authenticated asset routes can serve them.

## Reminder notifications

Due reminders are displayed inside the authenticated dashboard. Browser notifications require an explicit permission choice and are created only by an open Pasted page. Their title and description can appear in the operating system notification surface, so users should enable them only on a trusted device. A bounded local-storage list keyed by reminder ID and due time prevents the page from sending the same due notification repeatedly on that browser.

## Logging and error handling

Pino redacts password, token, URL, original URL, normalized URL, authorization, cookie, and set-cookie paths in the web process. The worker additionally redacts hostnames. Import source content is never an intentional log field.

Client errors receive a stable code, message, and selected validation details. Server and database errors are logged and returned as a generic failure. Do not add raw request bodies, complete Drizzle errors, auth headers, backup data, or remote response bodies to logs.

Logs can still contain user IDs, item IDs, timestamps, operation names, and safe error codes. Treat logs as operational data with access controls and retention limits.

## Deployment checklist

- Serve Pasted only through HTTPS and set the exact HTTPS `ORIGIN`.
- Generate a unique high-entropy `BETTER_AUTH_SECRET` and rotate it with a session invalidation plan.
- Use a dedicated PostgreSQL user and keep the database off the public internet.
- Encrypt database and backup storage and test restoration procedures.
- Place the metadata worker behind independent outbound firewall rules.
- Keep Node.js, PostgreSQL, the base images, and dependencies patched.
- Run the app and worker as unprivileged users with read-only filesystems, as the included Compose setup does.
- Review reverse proxy body, header, timeout, and rate limits.
- Protect logs and ensure proxy access logs do not record share tokens or sensitive query strings.
- Run `pnpm lint`, `pnpm check`, `pnpm test:unit`, `pnpm build`, and the migration checks before deployment.
