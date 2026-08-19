# Contributing

IELTS Study is currently maintained as a personal project. Contributions should keep product behavior, engineering documentation, and third-party content rights aligned.

## Before making a change

1. Read `README.md` and the relevant document under `docs/`.
2. Keep unrelated code, formatting, content, and dependency changes separate.
3. Never commit `.env`, provider credentials, local databases, logs, or user content.
4. Do not add or redistribute third-party exercises or media without confirming permission and provenance.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

AI credentials are optional for local-only screens but required to test writing evaluation, flashcard generation/evaluation, and chat.

## Change conventions

### Renderer and IPC

- Keep filesystem, database, and provider access in the main process.
- Expose only the minimum required preload method.
- Update `IElectronAPI`, preload, and IPC handler together.
- Validate new IPC input at runtime; TypeScript types alone are insufficient.
- Represent asynchronous operations with loading, disabled, error, and retry states.

### Database

- Migrations must be idempotent and tested against an in-memory legacy schema.
- Do not drop or reinterpret user data silently.
- Use transactions for changes that span multiple rows or tables.
- Document backup and compatibility implications.

### Internationalisation

- Add every new UI key to English, Italian, French, and Spanish locale files.
- Do not confuse interface language with the independently selected flashcard native language.
- Use interpolation for dynamic language names and counts.

### AI

- Document every field sent to a provider.
- Request bounded structured output and validate it before use.
- Keep prompts free of embedded secrets.
- Preserve a usable failure path when the provider is unavailable.
- Add cost, length, and abuse limits when expanding input scope.

### Exercise content

- Keep `source_url` or equivalent provenance with every imported item.
- Review scraped output manually.
- Separate dataset refreshes from application code changes.
- Follow `docs/CONTENT_PIPELINE.md` and `THIRD_PARTY_CONTENT.md`.

## Verification

Run checks proportionate to the change:

```bash
npm run typecheck
npx vitest run
npm run lint
npm run build
```

The current known baseline is documented in `docs/TESTING_AND_RELEASES.md`. Do not introduce new failures, and clearly identify any existing failure encountered during verification.

For UI changes, manually exercise the empty, loading, success, failure, persistence, and restart states. For database changes, test both fresh creation and upgrade.

## Documentation requirement

A change is incomplete if it makes the README or an engineering document inaccurate. Update:

- `README.md` for user-visible behavior or setup;
- `docs/ARCHITECTURE.md` for process or IPC changes;
- `docs/DATA_MODEL.md` for persistence or analytics rules;
- `docs/AI_AND_PRIVACY.md` and `SECURITY.md` for network/security changes;
- `docs/CONTENT_PIPELINE.md` for dataset changes;
- `docs/TESTING_AND_RELEASES.md` for build or release changes.

## Review checklist

- Is the behavior clear from the diff?
- Are failure and migration paths covered?
- Does the change preserve existing user data?
- Are IPC and AI boundaries validated?
- Are all locale files updated?
- Are third-party rights and attribution preserved?
- Do relevant tests and the production build pass?
- Does documentation describe the result rather than the intention?

