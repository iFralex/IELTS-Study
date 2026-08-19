# Testing and Releases

## Development commands

| Command | Purpose |
|---|---|
| `npm install` | Install packages and rebuild Electron native dependencies |
| `npm run dev` | Start Electron with the Vite development server |
| `npm run typecheck` | Check main/preload and renderer TypeScript projects |
| `npx vitest run` | Run the complete test suite once |
| `npx vitest run path/to/test.ts` | Run a focused test file |
| `npm run lint` | Run ESLint and Prettier checks |
| `npm run build` | Typecheck and build main, preload, and renderer outputs |
| `npm run build:unpack` | Build an unpacked Electron application directory |
| `npm run build:mac` | Encrypt environment payload, build, and package macOS DMG |
| `npm run build:win` | Build and request a Windows package |
| `npm run build:linux` | Build and request a Linux package |
| `npm run scrape` | Overwrite exercise datasets from the scraper pipeline |

There is currently no `npm test` script. Use `npx vitest run` until one is added.

## Test organization

Tests live under `src/tests`:

- `db.test.ts`: schema creation, idempotence, and legacy flashcard migration;
- `flashcardUtils.test.ts`: review-mode selection and quality mapping;
- `analyticsUtils.test.ts`: formatting helpers;
- `practice/utils.test.ts`: answer scoring, filters, series building, excerpts, and band conversion;
- `practice/writingUtils.test.ts`: Writing helper behavior.

Prefer unit tests for deterministic pure functions and in-memory SQLite tests for migrations. Add component tests for onboarding, error handling, and language switching as those flows mature.

## Current quality baseline

As of 2026-08-19:

- production build and TypeScript checks pass;
- database and flashcard-focused tests pass;
- the full suite passes all 56 tests across 5 test files;
- `estimateBand` tests explicitly cover perfect scores, half bands, zero-length exercises, and the different Listening/Academic Reading thresholds;
- repository-wide lint is not green because of accumulated formatting and rule violations, including scraper files and older renderer code.

Treat any future test failure as a regression until it is explained. If band conversion rules change, update the implementation, tests, and README together. Address lint in isolated mechanical changes to keep behavioral reviews readable.

## Native dependency note

`better-sqlite3` is a native module. `electron-builder install-app-deps` rebuilds it for Electron, while Vitest runs under the host Node.js ABI. If tests report a `NODE_MODULE_VERSION` mismatch, rebuild for the current host before tests:

```bash
npm rebuild better-sqlite3
```

Packaging may rebuild it again for Electron. Always test the packaged app after changing native dependencies.

## Manual smoke test

Before release, verify at least:

1. fresh startup with no existing database;
2. upgrade startup with a legacy Italian flashcard database;
3. interface language persistence;
4. first-use flashcard language selection from both the page and floating modal;
5. flashcard creation, all three review modes, deck switching, and statistics;
6. Listening and Reading single, series, and random modes;
7. Writing success and AI-failure persistence;
8. exam snapshots and final results for every section combination;
9. chat creation, rename, persistence, and deletion;
10. analytics for empty, partial, and populated databases;
11. reset behavior;
12. offline behavior for local content, remote media, and AI errors.

## Release checklist

### Source quality

- [ ] Working tree reviewed; no generated cache or secret files included.
- [ ] Typecheck passes.
- [ ] Focused tests for changed behavior pass.
- [ ] Full test result is recorded and all accepted failures are explained.
- [ ] Lint status is recorded.
- [ ] Production build passes.
- [ ] README and engineering docs match the implementation.

### Content

- [ ] Exercise counts and JSON schemas are validated.
- [ ] Remote image/audio links are checked.
- [ ] Source attribution and redistribution permission are confirmed.
- [ ] No accidental personal or licensed test data is included.

### Secrets and privacy

- [ ] `.env`, logs, database files, and provider responses are absent from the artifact.
- [ ] Provider credential is scoped, budget-limited, and rotated if necessary.
- [ ] No shared long-lived key is embedded in a public build.
- [ ] Privacy disclosure reflects every provider and remote content origin.

### Packaging

- [ ] Native modules match the target Electron ABI and architecture.
- [ ] Product name, app ID, version, icons, and artifact name are correct.
- [ ] Application signing is configured.
- [ ] macOS notarization is enabled for public macOS distribution.
- [ ] Install, first launch, upgrade, and uninstall are tested on each target OS.
- [ ] Packaged CSP, media, database, and AI flows are smoke-tested.

## Current packaging limitations

The checked-in configuration explicitly targets macOS DMG on ARM64 and sets `notarize: false`. It does not define a verified x64/universal macOS pipeline or detailed Windows/Linux signing and installer settings.

The package metadata still contains scaffold values for fields such as author, description, and homepage, and the renderer HTML title is still generic. Replace these before publishing artifacts. The package also does not declare `engines` or `packageManager`, so local toolchain reproducibility currently depends on contributor discipline.

Treat `build:win` and `build:linux` as build entry points, not evidence of supported production releases. Document successful target-specific tests before claiming platform support.

## Versioning and release notes

The package currently reports version `1.0.0`, but there is no documented versioning or changelog process. Before public releases:

1. adopt Semantic Versioning or document another policy;
2. maintain `CHANGELOG.md`;
3. tag the exact tested commit;
4. attach checksums and supported-platform details to each release;
5. document database compatibility and any irreversible migration.
