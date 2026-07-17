# Import formats

Pasted has two related import paths:

1. A link candidate pipeline for text, chat, JSON, CSV, Markdown, HTML, and browser bookmarks.
2. A versioned backup restore path for complete Pasted account data.

Both paths treat their input as untrusted. Link analysis normally runs inside a browser Web Worker. Backup JSON is validated in the browser and validated again by the server before a transactional restore.

## Link candidate pipeline

The importer receives this common input shape:

```ts
interface ImportInput {
	content: string;
	filename?: string;
	mimeType?: string;
	format?: ImportFormat;
}
```

The pipeline then:

1. Measures the UTF-8 input size.
2. Detects a format, unless the user selected one explicitly.
3. Runs the registered parser for that format.
4. Normalizes each extracted URL.
5. Marks invalid URLs and duplicates.
6. Detects and masks likely secrets.
7. Returns review candidates and aggregate counts.

Parsing is synchronous inside the worker and makes no network requests. Metadata and redirects are not fetched during analysis.

## Format detection

Explicit selection has priority. Automatic detection uses, in order, Netscape bookmark markers, WhatsApp message headers, file extension or MIME type, JSON container shape, HTML elements, Markdown structure, and consistent delimited rows. Content that does not match a more specific format becomes generic text.

The result includes a confidence score and human-readable reasons. The review screen lets the user choose another parser and rerun analysis.

## Supported link inputs

### Text and pasted text

The text parser examines each non-empty line and records its line number. It finds multiple URLs per line, case-insensitive HTTP or HTTPS schemes, and high-confidence bare domains such as `example.com/path`.

### WhatsApp text exports

The WhatsApp parser recognizes common bracketed and unbracketed date, time, sender, and message headers. Continuation lines are attached to the current message before extraction.

Only URLs are emitted. Sender names, phone numbers, ordinary messages, deleted-message markers, and media placeholders are not emitted or sent to the server. A valid message date is retained as `sourceDate`. The source excerpt is reduced to the URL itself.

The repository fixture at `tests/fixtures/import/fake-whatsapp.txt` is synthetic. A personal `_chat.txt` file must never be committed, copied into screenshots, or included in logs.

### JSON

The JSON parser checks nesting depth before calling `JSON.parse`, then walks every string in nested objects and arrays with an iterative stack. It does not assume a vendor schema. A sibling `title`, `name`, or `label` can provide the title for an `href`, `link`, or `url` property.

Property paths such as `$.items[0].url` become local review labels. They are not stored as account content.

### CSV and TSV

The parser detects comma, semicolon, or tab delimiters. It supports quoted fields, escaped quotes, and line breaks inside quoted fields. Every text cell is scanned. A header named `title`, `name`, or `label` can supply candidate titles.

There is no column selection control in the parser API. Large files are protected by row, column, cell, candidate, and total byte limits.

### Markdown

The Markdown parser handles inline links, reference definitions, autolinks, and plain URLs. Matched Markdown links are masked before the remaining text is scanned so one link is not returned twice.

Markdown is parsed as text. No embedded code or HTML is executed.

### HTML

The HTML parser removes `script`, `style`, `template`, and `noscript` regions before inspection. It reads `href` values from anchors, derives an optional plain-text title, and scans remaining visible text for URLs.

The parser does not create a browser DOM and does not execute JavaScript. Imported titles are plain text and Svelte escapes them when rendered.

### Netscape browser bookmarks

The bookmark parser supports the HTML interchange format exported by Chrome, Firefox, Safari, Edge, and other browsers. It reads anchor URLs and titles, `ADD_DATE` timestamps, and nested `H3` folder paths. Folder paths are review metadata and can inform organization, but the current candidate import uses the collection selected for the import session.

## URL extraction and normalization

Extraction first removes invisible Unicode characters used by some chat exports. It recognizes explicit HTTP and HTTPS URLs, bare domains, and dangerous scheme-shaped values that need to remain visible as invalid review rows.

Surrounding opening brackets and quotes are removed. Trailing commas, periods, semicolons, colons, exclamation marks, question marks, and quotes are removed. A closing parenthesis, bracket, or brace is removed only when it is unmatched, so balanced punctuation inside a URL remains intact.

Normalization follows these rules:

- A bare domain receives `https://` for parsing.
- Only `http:` and `https:` are accepted.
- `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, and `about:` are marked dangerous.
- Other schemes are marked unsupported.
- The platform URL parser canonicalizes the hostname, default port, and percent encoding.
- Hostnames are compared in lowercase.
- Known analytics parameters, including names beginning with `utm_`, are removed by default.
- Resource-defining parameters, their order, and normal fragments are preserved.
- A fragment is removed only when its name is a known tracking parameter.
- URLs longer than 8,192 characters are invalid.

Each review candidate keeps `originalUrl` and a separate `normalizedUrl`. `displayUrl` is the masked value intended for the interface. Do not render `originalUrl` when secret findings are present.

Duplicate detection compares the complete normalized URL. The first occurrence is new, later occurrences point to the first candidate, and normalized URLs supplied from the account are marked as existing. The server repeats normalization and account duplicate checks before persistence. Users may explicitly allow a duplicate in the relevant import plan.

## Secret detection

The browser flags:

- URL usernames and passwords
- Sensitive query names such as `token`, `api_key`, `password`, `secret`, `signature`, and `webhook`
- Common AWS, GitHub, GitLab, Slack, and Stripe token shapes
- JWT-shaped strings
- Common webhook URL paths

Candidates contain categories and masked previews, never a full secret preview. Source excerpts and titles are masked. Detection is heuristic and can miss novel secret formats, so users should still inspect candidates before import.

## Default limits

| Limit                   |            Value |
| ----------------------- | ---------------: |
| Input text              |     10 MiB UTF-8 |
| Candidates              |           10,000 |
| URL length              | 8,192 characters |
| Source excerpt          |   180 characters |
| JSON depth              |               64 |
| JSON values visited     |          100,000 |
| JSON string or CSV cell |            1 MiB |
| CSV rows                |           50,000 |
| CSV columns per row     |              250 |
| Server batch            |   100 candidates |

Limit failures stop analysis and return a typed error. Limits can be lowered by callers for tests or constrained deployments, but increasing them requires memory and responsiveness testing.

## Privacy boundary

The browser reads the complete source file. The normal link import request sends only:

- a client-generated candidate key
- the original candidate URL
- an optional title and source date
- selection state and secret categories
- selected collection, tags, and a generic source type
- counts and idempotency keys

It does not send the filename, raw file, source labels, sender names, full chat messages, or source excerpts. The server stores import session counters and candidate URLs, not the original document. Logs must not include file contents or URL fields.

## Server import sessions

`POST /api/v1/imports` creates a review session for up to 10,000 sanitized candidates. The server assigns states such as new, duplicate in file, duplicate in account, invalid, skipped, imported, or failed. Review updates select candidate keys, edit titles, and change taxonomy.

`POST /api/v1/imports/{id}/batches` imports at most 100 selected candidates per request. The server uses a request idempotency key, transactions, and per-account normalized targets. Import progress is derived from persisted candidate states. A session can be cancelled between safe batches, and failed candidates can be retried explicitly.

Metadata jobs are queued after links exist. The import does not wait for remote pages.

## Writing a parser adapter

Every link parser implements this interface:

```ts
interface ImportParser {
	readonly format: ImportFormat;
	parse(input: ImportInput, context: ParserContext): RawParserResult;
}
```

A `RawParserResult` contains the parser format, candidates, ignored count, and warnings. Each raw candidate needs a `rawUrl` and may include a title, ISO source date, source label, short excerpt, or collection path.

To add a format:

1. Add its literal to `ImportFormat` in `src/lib/import/types.ts`.
2. Create a parser in `src/lib/import/parsers`.
3. Register it in `src/lib/import/registry.ts`.
4. Add conservative detection in `src/lib/import/detect.ts`.
5. Reuse `appendUrlsFromText`, `extractUrls`, `cleanTitle`, and the limit helpers.
6. Call `assertCandidateCount` as candidates are appended.
7. Add the client option and extend the server import format schemas.
8. Add a Drizzle enum migration if the persisted format is new.
9. Add unit fixtures for valid, malformed, oversized, Unicode, dangerous scheme, duplicate, and secret-bearing input.

Parsers must be browser-safe. Do not import Node.js modules, access the network, build a live DOM, evaluate code, or retain full input in a candidate. A parser should return evidence needed for review, not a copy of the source document.

## Pasted backup version 1

A complete backup has this top-level shape:

```json
{
	"format": "pasted-backup",
	"version": 1,
	"exportedAt": "2026-07-17T12:00:00.000Z",
	"generator": { "name": "Pasted", "version": "0.0.1" },
	"manifest": {
		"itemCount": 0,
		"collectionCount": 0,
		"tagCount": 0,
		"selection": {},
		"filters": {},
		"privacy": {}
	},
	"data": {
		"collections": [],
		"tags": [],
		"items": []
	}
}
```

Each item has shared IDs, timestamps, title, description, collection and tag relations, state, favorite, archive, order, and optional source date. A discriminated payload then contains link URL and metadata fields, a note body, or reminder schedule and completion fields.

JSON validation checks the format and version, dates, enum values, UUIDs, unique IDs, manifest counts, URLs, and collection or tag references. Default restore limits are:

| Limit                 |   Value |
| --------------------- | ------: |
| Backup JSON           |  50 MiB |
| ZIP input             |  50 MiB |
| ZIP uncompressed data | 100 MiB |
| Items                 | 100,000 |
| Collections           |  10,000 |
| Tags                  |  25,000 |

A ZIP backup contains only `pasted-backup.json` and `README.txt`. The ZIP reader ignores other names, bounds declared uncompressed sizes, requires the JSON member, and validates the decoded backup.

The server restore endpoint accepts a validated backup object and an idempotency key. Restore runs in one database transaction. Existing collections and tags are reused by exact name; new ones are created and their old IDs are mapped to new account-owned IDs. Items receive new IDs while their collection and tag relationships, content, state, dates, and order are retained. Normalized link targets are reused per account. A repeated idempotency key with the same backup returns the previous summary; reuse with different content is rejected.

Privacy exclusions are permanent in the exported artifact. A backup created without note bodies, personal notes, source dates, link metadata, or reminder descriptions cannot reconstruct those fields during restore.

## Known limitations

- Bare-domain recognition is intentionally conservative and does not cover every valid internationalized hostname shape.
- WhatsApp date parsing assumes day, month, year ordering used by the supported text exports.
- CSV scans every column and does not yet expose a per-column picker.
- Bookmark folder paths are detected, but normal candidate imports do not create the folder tree automatically.
- Backup restore merges collections and tags by exact name and creates new item IDs. It is not an in-place synchronization protocol.
- Backup ZIP export contains structured data only. Favicon and preview image bytes are not included.
- Secret detection is heuristic and is not a credential scanner with complete provider coverage.
