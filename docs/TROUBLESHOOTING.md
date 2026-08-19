# Troubleshooting

## Application does not start in development

1. Confirm a supported Node.js runtime; Node.js 22 LTS is recommended.
2. Install dependencies from the repository root:

   ```bash
   npm install
   ```

3. Run the static checks:

   ```bash
   npm run typecheck
   ```

4. Start development mode:

   ```bash
   npm run dev
   ```

If the renderer starts but Electron does not, inspect both the terminal output and the Electron developer console. Main-process errors appear in the terminal; renderer errors appear in DevTools.

## `better-sqlite3` ABI mismatch

A message mentioning `NODE_MODULE_VERSION` means the native binary was compiled for a different runtime.

For host-Node tests:

```bash
npm rebuild better-sqlite3
npx vitest run
```

For Electron packaging, reinstall or allow the postinstall/build process to run `electron-builder install-app-deps`. Rebuilding for one runtime can make the binary incompatible with the other, so verify both tests and the packaged application.

## AI features fail

Check `.env`:

```dotenv
AI_PROVIDER=anthropic
AI_MODEL=your-model-id
AI_API_KEY=your-api-key
```

Then verify:

- provider is exactly `anthropic`, `google`, or `openai`;
- the model identifier exists for that provider and SDK version;
- the key is active and authorized for the model;
- account quota, billing, and rate limits permit the request;
- the computer can reach the provider over HTTPS;
- the app was restarted after changing `.env`.

Writing, flashcard, and chat errors can have different response-shape requirements. A model returning prose instead of the requested JSON can cause structured features to fail even when chat works.

## AI works in development but not in a package

The packaged app reads `env.enc` from its resources directory, not the project `.env`.

For the current macOS flow, use:

```bash
npm run build:mac
```

Confirm that the encryption step completed and the artifact contains `env.enc`. Do not use this embedded-credential mechanism for public distribution; see `SECURITY.md`.

## Images or audio do not load

Exercise media is remote. Confirm:

- the device is online;
- the stored URL still resolves;
- it uses HTTPS and the `ieltsliz.com` origin allowed by the CSP;
- the host is not blocking the request;
- the asset was not moved or removed.

Reading passages and exercise metadata are bundled locally, but a Listening exercise without reachable audio is not fully usable.

## Exercises are missing

The main process returns an empty array when a dataset cannot be read or parsed. Check that these files exist and contain valid JSON:

```text
data/listening/exercises.json
data/reading/exercises.json
data/writing/task1.json
data/writing/task2.json
```

In a packaged build, confirm they were copied into the resources `data` directory. If the scraper was run recently, inspect the Git diff: it overwrites complete datasets and can skip pages after network or extraction failures.

## Progress or settings appear to reset

Confirm the application is using the expected Electron user-data directory and product identity. Development and differently named/package-ID builds can use different directories.

Do not copy or replace an active SQLite file. Close the app first. For backup guidance, see `docs/DATA_MODEL.md`.

The in-app full reset deletes study, exam, flashcard, review, and chat records but leaves settings. If only the interface or flashcard language remains, that is expected.

## Legacy flashcards are missing after choosing a language

Cards created before multi-language support are assigned to the Italian deck. Select Italian from the Flashcard page language selector. Other languages use separate decks.

## macOS warns that the application cannot be verified

The current builder configuration has notarization disabled. Development DMGs may trigger Gatekeeper warnings. Do not instruct users to bypass operating-system security controls for an untrusted artifact. Configure signing and notarization before public distribution.

## Tests fail while the build passes

The current baseline has a green test suite. Treat any failure as a regression until the cause is understood. For `estimateBand`, confirm that the caller supplies the section and that the expectation uses the appropriate Listening or Academic Reading conversion table.

## Lint produces a large report

The repository has pre-existing lint and formatting debt. Use focused linting on changed files during feature work, and address repository-wide formatting separately to avoid hiding behavior changes inside a mechanical rewrite.
