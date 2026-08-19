# Security Policy

## Scope

This document describes the current security posture of IELTS Study. It is not a claim that the application has undergone a professional security audit.

## Current controls

- The renderer accesses privileged operations through an explicit preload bridge.
- Database, filesystem, and AI-provider calls run in the main process.
- The renderer Content Security Policy restricts scripts to the application and media/images to the application, data URLs where allowed, and `ieltsliz.com`.
- New-window navigation is denied in the application window and redirected to the operating-system browser.
- `.env` is ignored by Git.
- SQLite uses WAL mode, and multi-answer inserts run in a transaction.
- AI keys are not returned through `window.api`.

## Credential model

In development, the application reads `AI_API_KEY` from `.env`.

The macOS packaging script currently encrypts that file into `resources/env.enc` with AES-256-CBC. The matching decryption secret is embedded in the source and therefore in the packaged application. This design hides plaintext from casual inspection but does not protect a shared API key from someone who can inspect or execute the package.

For any distributed build, use one of these models instead:

1. ask each user for their own provider key and store it in the platform credential vault;
2. broker requests through a controlled backend that enforces authentication, quotas, and abuse controls;
3. use short-lived scoped credentials where the provider supports them.

Never publish `.env`, decrypted configuration, CI secrets, or a reusable production provider key. If a credential may have been exposed, revoke it at the provider, create a replacement, inspect usage, and remove it from Git history and release artifacts.

## Known security limitations

### Electron configuration

The BrowserWindow currently sets:

- `sandbox: false`;
- `webviewTag: true`.

The app does not currently require embedded webviews. Before production distribution, disable `webviewTag`, enable the Chromium sandbox if compatible, and set `contextIsolation: true` and `nodeIntegration: false` explicitly rather than relying on defaults.

### IPC validation

TypeScript types do not validate runtime input. Several IPC handlers accept IDs, strings, arrays, limits, roles, settings keys, and content without schema or range validation. A compromised renderer could call these handlers with malformed values.

Before treating the renderer as untrusted:

- validate every payload in the main process;
- allowlist settings keys, roles, sections, providers, and language codes;
- cap message, essay, answer, and batch sizes;
- reject invalid numeric IDs and limits;
- return normalized error objects rather than raw exceptions.

### AI output

AI JSON is repaired and parsed but not schema-validated. Add strict schemas, bounds, and safe fallbacks before persisting or rendering provider output.

### Database integrity

Foreign-key relationships are declared, but foreign-key enforcement is not explicitly enabled. Enable `PRAGMA foreign_keys = ON`, add integrity tests, and use transactions for multi-table destructive operations.

### Remote content

Images and audio load from IELTS Liz. Remote servers receive the usual IP address and request metadata, and remote assets can change or disappear. Pinning or locally packaging authorized assets would improve reproducibility but requires redistribution permission.

### Availability and spending

AI calls have no explicit timeout, cancellation, retry, rate limiting, or cost guard. Configure provider-side budgets and add client-side limits before wider distribution.

### Packaging

The current macOS package is ARM64-only, unsigned/not notarized by configuration, and should be considered a development artifact. Windows and Linux release security have not been documented as verified.

## Security hardening checklist

- [ ] Remove the embedded shared-key credential design.
- [ ] Rotate any credential used in development before public distribution.
- [ ] Enable Electron sandboxing and remove unused webview support.
- [ ] Add runtime schemas for IPC input and AI output.
- [ ] Enable and test SQLite foreign-key enforcement.
- [ ] Add request timeouts, cancellation, rate limits, and cost controls.
- [ ] Configure platform signing and macOS notarization.
- [ ] Add dependency and secret scanning in CI.
- [ ] Review Content Security Policy whenever adding a remote origin.
- [ ] Perform a release-artifact inspection for credentials and source maps.

## Reporting a vulnerability

No public security contact is configured in this repository. Until one is added, report vulnerabilities privately to the repository owner or maintainer and avoid filing a public issue containing credentials, personal data, or working exploit details.

Include the affected version, platform, reproduction steps, impact, and any proposed mitigation. Do not access data that is not yours while testing.

## Supported versions

There is currently no formal long-term support policy. Security fixes apply to the latest maintained source revision. Add a supported-version table when versioned public releases begin.

