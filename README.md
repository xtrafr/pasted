# Pasted

Pasted is a private desktop library for links, notes, and images. It keeps each library in a folder on your computer, works without an account, and includes a review-first WhatsApp link importer.

## Features

- Save and organize links, notes, and images.
- Import links from WhatsApp `.txt` chat exports.
- Review every detected link before anything is saved.
- Import and export browser bookmarks.
- Group content into folders and separate local libraries.
- Search saved links and notes instantly.
- Write rich notes with Markdown support.
- Work offline with a local SQLite database.

## WhatsApp import

1. Export a WhatsApp chat without media and save its `.txt` file.
2. Open or create a library in Pasted.
3. Open the three-dot menu and choose **import WhatsApp chat**.
4. Review the detected links. Potentially sensitive links are marked and left unselected by default.
5. Select the links you want and import them.

The importer reads the export locally. It does not save the chat file, message text, sender names, or message excerpts. Only selected HTTP and HTTPS links are added to the open library, and the importer does not request metadata from those links. Files are limited to 25 MB, and up to the first 10,000 unique links are reviewed.

## Install

Packaged builds can be published on the [releases page](https://github.com/xtrafr/pasted/releases). You can also build Pasted locally with the commands below.

On macOS, unsigned local builds may need to be allowed manually:

```sh
xattr -dr com.apple.quarantine /Applications/Pasted.app
```

## Development

Requirements:

- Node.js 22.12 or newer
- npm

Install dependencies and start the Electron development app:

```sh
npm install
npm run dev
```

Run the full validation suite and create a production bundle:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Platform packages are available through `npm run build:win`, `npm run build:mac`, and `npm run build:linux`.

## Publishing a release

1. Update the version in `package.json` and commit it.
2. Create and push the matching tag, such as `v1.0.0`.
3. In GitHub Actions, run **Build and draft desktop release** and enter that tag.
4. Review the generated Windows, macOS, and Linux artifacts in the draft release, then publish it.

## Local data and API

Each library is an ordinary folder containing a `library.json` file, a local SQLite database, and an `images` directory. Pasted stores its app settings and recent library list in the operating system data directory selected by `env-paths` under the `pasted` namespace.

The local API listens only on `127.0.0.1`, using port `8001` by default. You can change the port from the app menu.

## Privacy

Pasted does not require an account and does not send your saved content to a hosted service. When you manually add a regular link, its metadata request contacts the destination website. WhatsApp imports deliberately skip that metadata request.

## Attribution

Pasted is based on an open source project released under the MIT License. See [UPSTREAM.md](UPSTREAM.md) for source and attribution details. The original copyright and permission notice are preserved in [LICENSE](LICENSE).

## License

Licensed under the [MIT License](LICENSE).
