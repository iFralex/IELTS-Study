# AI, Privacy, and Network Use

## Summary

IELTS Study stores progress locally, but it is not a fully offline application. AI features send task-specific content to the configured provider, and some exercise media is loaded from IELTS Liz.

No telemetry or analytics service is implemented in the application code. This does not prevent the selected AI provider or remote media host from receiving normal network metadata under their own terms.

## Local versus remote data

| Data or action | Local persistence | Sent or loaded remotely |
|---|---:|---:|
| Listening/Reading answers and scores | Yes | No, unless included manually in chat |
| Writing essay and AI feedback | Yes | Essay, prompt, task type, and word count are sent to the AI provider |
| Flashcard card and review history | Yes | Word, translations, user answers, and reference answers are sent for generation/evaluation |
| Chat history | Yes | The message array supplied for a reply is sent to the AI provider |
| Interface and flashcard language settings | Yes | Language name is included in flashcard prompts where needed |
| Exercise JSON | Bundled with the app | No at runtime |
| Writing images and listening media | URL stored in bundled JSON | Loaded from `ieltsliz.com` at runtime |
| Usage telemetry | No implementation | None initiated by the app |

Provider SDKs communicate over HTTPS. Provider-side storage, logging, training, retention, regional processing, and abuse monitoring depend on the selected provider and account configuration. Review those terms before entering personal or confidential content.

## Provider configuration

Configuration is read from environment values:

```dotenv
AI_PROVIDER=anthropic
AI_MODEL=your-model-id
AI_API_KEY=your-api-key
```

Supported provider identifiers are:

- `anthropic`;
- `google`;
- `openai`.

Unknown providers throw an error. Model names are passed directly to the provider SDK, so compatibility depends on the installed SDK version and the provider account.

Development uses `.env`. The file is ignored by Git and must never be committed. Packaged macOS builds currently consume an encrypted environment payload; see `SECURITY.md` for its limitations.

## AI operations and contracts

### Flashcard generation

Input:

- English word or short phrase;
- selected native language.

Expected output:

- English form and native-language translation;
- synonyms or paraphrases in both languages;
- three short English examples and corresponding translations.

### Text review evaluation

Input:

- English word;
- review direction;
- user's answer;
- stored reference answer;
- selected native language.

Expected output includes correctness, quality from 1–5, a short explanation, and alternatives.

### Audio review evaluation

Input includes the English reference, native-language reference, user's English spelling, user's translation, and selected language. English and translation correctness are returned independently.

### Writing evaluation

Input includes task type, original prompt, complete essay, and word count. The expected response includes band, overall summary, strengths, improvements, vocabulary suggestions, individual word annotations, and optional sentence rewrites.

### Chat

The supplied conversation message array is sent with an IELTS tutor system instruction. The application stores chat messages locally before and after provider calls through separate IPC operations.

The current system instruction explicitly asks the model to answer in Italian when the user writes in Italian. It does not pass the selected interface language or contain equivalent explicit rules for French and Spanish, so response-language behavior outside Italian is model-dependent.

## Parsing and validation

Structured responses are requested as JSON. `parseAiJson()`:

1. removes Markdown JSON fences;
2. extracts the first object-shaped block;
3. repairs literal control characters inside JSON strings;
4. calls `JSON.parse`.

The parsed object is trusted at runtime and is not currently checked against a schema. Invalid responses either throw or, for flashcard review operations, are returned as raw output and shown through the degraded-error path.

Recommended improvement: validate every AI result with Zod before it reaches persistence or UI state.

## Failure behavior

- Writing practice saves the user's text even if AI evaluation fails.
- Exam writing evaluation can be skipped.
- Flashcard generation reports an error and allows retry.
- Flashcard review can show an AI-unavailable state; its scheduling fallback should be treated as degraded behavior rather than authoritative evaluation.
- Chat reports a request error without deleting stored conversation history.

There is currently no application-level AI timeout, retry policy, cancellation, rate-limit handling, or provider failover. SDK/network errors propagate to the calling feature.

## Offline behavior

Without network access:

- bundled Reading text and locally stored progress remain available;
- AI generation, evaluation, and chat are unavailable;
- remotely hosted images and listening audio may be unavailable;
- previously stored AI feedback and chat messages remain readable.

## Privacy recommendations

- Use a personal provider credential with spending limits.
- Do not enter secrets, health information, financial data, or third-party personal data.
- Explain provider processing before distributing the app to other users.
- Add an explicit consent notice before the first AI call if the app becomes multi-user.
- Offer local export and deletion controls before treating the app as a production consumer product.
- Consider local models only if fully offline processing is a product requirement.
