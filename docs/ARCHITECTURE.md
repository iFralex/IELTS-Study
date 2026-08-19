# Architecture

## System context

IELTS Study is a single-user Electron desktop application. It combines a React renderer, a privileged Electron main process, static exercise datasets, a local SQLite database, and an optional external AI provider.

```text
┌─────────────────────────────────────────────────────────────┐
│ React renderer                                              │
│ pages · components · i18next · browser speech synthesis     │
└──────────────────────────┬──────────────────────────────────┘
                           │ typed window.api calls
┌──────────────────────────▼──────────────────────────────────┐
│ Preload bridge                                              │
│ explicit contextBridge methods backed by ipcRenderer.invoke │
└──────────────────────────┬──────────────────────────────────┘
                           │ Electron IPC
┌──────────────────────────▼──────────────────────────────────┐
│ Main process                                                │
│ lifecycle · IPC handlers · validation · AI orchestration     │
└──────────────┬─────────────────┬──────────────────┬──────────┘
               │                 │                  │
        ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼─────────┐
        │ SQLite      │   │ data/*.json │   │ AI provider    │
        │ userData    │   │ read-only   │   │ HTTPS request  │
        └─────────────┘   └─────────────┘   └────────────────┘
```

The renderer also loads selected chart images and listening media directly from `https://ieltsliz.com`, as allowed by the renderer Content Security Policy.

## Runtime processes

### Main process

`src/main/index.ts` owns the Electron lifecycle:

1. In development, load `.env` with `dotenv`; in a packaged app, attempt to decrypt `env.enc`.
2. Wait for `app.whenReady()`.
3. register IPC handlers once;
4. create a `1280 × 800` browser window with a `960 × 600` minimum;
5. load the Vite development URL or packaged renderer HTML;
6. open new-window requests in the operating-system browser;
7. recreate the window on macOS activation and quit on other platforms when all windows close.

The main process is the only layer that reads exercise JSON files, opens SQLite, or calls an AI provider.

### Preload bridge

`src/preload/index.ts` exposes an explicit `window.api` surface with `contextBridge`. It contains methods for exercises, sessions, analytics, exams, flashcards, writing evaluation, chats, data reset, and settings.

The shared contract lives in `src/renderer/src/types/index.ts`. When adding or changing an IPC method, update all three layers together:

1. the `IElectronAPI` type;
2. the preload implementation;
3. the main-process handler.

### Renderer

`src/renderer/src/App.tsx` owns routing and global overlays. Pages manage feature-level state; reusable components encapsulate exercise inputs, results, charts, exam sections, and flashcard workflows.

The renderer must treat `window.api` as an asynchronous boundary. Database and network operations can fail, so pages should expose loading, error, retry, and disabled states rather than assuming an immediate response.

## Primary runtime flows

### Practice session

```text
Select section
  → get-exercises
  → filter/build exercise queue in renderer
  → collect answers and elapsed time
  → score locally
  → save-session
  → save-answers transaction
  → render results/review
```

Listening and Reading answers are scored in the renderer. Answer normalization, multi-select matching, passage excerpts, and raw-score-to-band conversion live in `components/practice/utils.ts`.

Writing differs: the renderer sends the essay to `evaluate-writing`; the main process requests structured AI feedback; the submission and feedback JSON are then stored in `sessions` with `section = 'writing'`.

### Exam simulation

The simulator is an in-memory state machine that chains selected sections. Each section owns its timer and takes a snapshot at the standard target:

- Listening: 40 minutes;
- Reading: 60 minutes;
- Writing Task 1: 20 minutes;
- Writing Task 2: 40 minutes.

The user can continue after the snapshot. Results distinguish answers/text at the target time from the final submission. At completion, section records and the aggregate `exam_runs` record are persisted.

### Flashcards

The first flashcard interaction requires a native-language choice. The selection is stored under `settings.flashcard_native_language`. Cards are partitioned by `native_language`, so switching language changes the active deck without rewriting other cards.

```text
English word
  → generate-flashcard(language)
  → editable preview
  → save-flashcard
  → due-card selection
  → text or audio review
  → AI evaluation
  → SM-2-inspired scheduling update + review history
```

Legacy cards are migrated to Italian. Supported native languages are declared in the shared type module and used by the UI and main-process prompt construction.

### AI chat

Conversation metadata and messages are stored locally. For each generated reply, the current message array is sent to the configured provider. Persistence and model invocation are separate IPC operations.

## Build architecture

`electron-vite` builds three targets:

- main process bundle;
- preload bundle;
- renderer client bundle.

The Vercel AI SDK, provider SDKs, and Zod are bundled into the main output because their package export layout is not reliable through ASAR resolution. `better-sqlite3` remains external and is unpacked because it contains a native binary.

Static exercise JSON is copied as an extra resource. The encrypted environment payload is copied into the packaged resources directory when present.

## Trust boundaries and current constraints

- The renderer has no direct Node.js or filesystem API, but it can invoke the methods exposed by preload.
- IPC payloads are typed at compile time; runtime validation is limited and should be strengthened before accepting untrusted renderer input.
- The BrowserWindow currently has `sandbox: false` and `webviewTag: true`. No application feature requires a webview today, so this should be reviewed.
- External provider responses are parsed as JSON but are not schema-validated.
- There is no request cancellation, timeout, retry, or provider health check around AI calls.
- Exercise datasets are loaded synchronously by the main process. This is acceptable at the current size but should be revisited if datasets grow substantially.

See `SECURITY.md` for the security implications and recommended hardening work.

## Adding a feature safely

1. Add or update shared types first.
2. Add the smallest necessary IPC method; validate external input in the main process.
3. Keep persistence and provider access outside the renderer.
4. Add database columns through an idempotent migration.
5. Add all four UI locale keys in the same change.
6. Cover pure logic and migrations with Vitest.
7. Run typecheck, focused tests, the full suite, and a production build.
8. Update the README and the relevant engineering document.
