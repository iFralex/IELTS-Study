# IELTS Study

A personal IELTS preparation desktop app. Practice Listening, Reading, and Writing; run full exam simulations with timed sections; build vocabulary with AI-powered flashcards; and track every session through an analytics dashboard.

All data stays local. AI features (writing feedback and flashcard generation) are powered by a configurable AI model — swap provider and model via a single `.env` change, no code edits required.

The interface is fully multilingual: **English, Italian, French, and Spanish** are all built in. Switch language at any time from the sidebar — the choice is remembered across app restarts.

---

## What's inside

| Section | What you can do |
|---------|----------------|
| 🏠 Dashboard | Overview of recent sessions, exam results, and key stats |
| 🎧 Listening | 41 exercises across 5 question types, with audio player |
| 📖 Reading | 32 exercises across 7 question types, with split-pane layout |
| ✍️ Writing | 20 tasks (Task 1 + Task 2) with AI band scoring and model answers |
| 📝 Exam Simulator | Full timed simulation across all three sections |
| 🃏 Flashcard | Spaced-repetition vocabulary trainer with AI card generation |
| 📊 Analytics | Deep progress dashboard with band estimates, trends, and coverage |
| 💬 Chat | Persistent AI tutor chat with conversation history |

---

## Getting Started

**Prerequisites:** Node.js 18+ and an AI API key. Create a `.env` file at the project root:

```bash
AI_PROVIDER=anthropic          # anthropic | google | openai
AI_MODEL=claude-haiku-4-5-20251001
AI_API_KEY=your_key_here
```

```bash
npm install
npm run dev        # launches the Electron app in development mode
```

The app opens with the **Dashboard**. From there:

1. Head to **Listening** or **Reading** for your first practice session
2. Add a word to **Flashcard** using the floating 🃏 button — it's available on every screen
3. After a few sessions, check **Analytics** to see where your accuracy drops
4. When you feel ready, run a full **Exam Simulation**

---

## Features in Depth

### Dashboard

The opening screen. It loads three things in parallel:

- **Four stat cards** — total sessions completed, average accuracy across all answers, total time studied, and number of full exam simulations run. These cover the last 30 days.
- **Recent sessions** — the five most recent completed exercises, with section, score, and date.
- **Recent exam runs** — the last three simulations with per-section scores (Listening %, Reading %, Writing band). Clicking any exam run navigates to the Exam Simulator.

The dashboard is a snapshot, not a deep report — go to Analytics for charts and trends.

---

### Listening Practice

**Content:** 41 exercises. Each has an audio recording, a set of questions, and a question type label — gap fill, form completion, multiple choice, map/diagram, or table. All exercises are rated medium difficulty.

**How a session works:**

1. Browse the exercise list, optionally filtering by question type. Completed exercises are marked with a green "done" badge; you can toggle whether they appear in the list.
2. Choose a practice mode:
   - **Single** — pick one exercise and do it alone.
   - **Series by type** — queue every incomplete exercise of the selected type.
   - **Random** — a shuffled queue of up to 10 incomplete exercises.
3. The exercise opens with a **sticky audio player** at the top. Play/pause and seek freely — there's no enforced single-play rule in practice mode.
4. Answer each question in the appropriate input. Gap-fill and form-completion questions use a text field; multiple-choice questions show radio buttons; "Choose THREE" questions (options embedded in the question text) render as checkboxes parsed automatically from the `A=Label` inline format.
5. Submit with "Controlla". Results appear immediately: each question shows correct/incorrect, your answer, and the correct answer. A **band estimate** (5, 6, 7, or 8–9) is calculated from the percentage correct. The results panel includes the **audio player** so you can replay the recording while reviewing.

**Answer matching** is flexible: a multiple-choice answer stored as "B – Columbian mammoth" matches the answer key "B"; True/False/Not Given and Yes/No/Not Given answers match regardless of spacing or casing; multi-select answers ("A, C, E") match any ordering of the same set.

Each completed session — score, time spent, question type, and per-question answers — is saved to the local database.

---

### Reading Practice

**Content:** 32 exercises covering all seven IELTS Reading question types: True/False/Not Given, Yes/No/Not Given, matching headings, matching paragraph information, multiple choice, sentence completion, summary completion, and short answer.

**The interface** uses a permanent **split-pane layout**: the passage fills the left 55% of the screen; questions and answers occupy the right 45%. Both halves scroll independently, so you can read and answer without losing your place.

Matching-headings questions label each paragraph (A, B, C…) automatically to match the question wording.

**"Find in passage"** is the most useful feature here. After submitting, any question you got wrong shows a small "Find in passage" link. Clicking it reveals a highlighted excerpt from the reading text — a ~300-character window centred on the correct answer, with the answer itself marked in yellow. This replaces the tedious manual search through a long passage.

Same practice modes as Listening (single, series by type, random), same band estimate logic, same persistence.

---

### Writing Practice

**Content:** 7 Task 1 exercises (bar, line, pie, table, map, and process diagram) and 13 Task 2 essays (opinion, discussion, problem/solution, direct question, advantages/disadvantages). Each task has a target band, a model answer, and key vocabulary/phrases.

**The workflow:**

1. Switch between **Task 1 — Grafico** and **Task 2 — Essay** tabs. Each task shows its type badge and target band score.
2. Select a task. The prompt (and chart image, for Task 1) appears in a fixed area above the editor so you can refer to it while writing.
3. Write in the full-height text editor. A **live word counter** at the bottom tracks your count against the IELTS minimum (150 words for Task 1, 250 for Task 2). The counter turns yellow when you're under the threshold and green when you meet it. The submit button stays disabled until you've written something.
4. Click **Invia**. The text is sent to the configured AI model (acting as an IELTS examiner). While it evaluates, the button shows a loading state.

**AI feedback includes:**
- An estimated **IELTS band score** (e.g. 6.5), displayed large
- A 2–3 sentence **overall summary** of the response
- A **strengths panel** (green) — what you did well
- An **improvements panel** (red) — specific things to fix
- **Vocabulary suggestions** — words and phrases that would raise the score, shown as chips

Below the feedback, a collapsible **Model answer** section shows the reference essay at the task's target band, plus key vocabulary or phrases worth studying.

If the AI call fails (network issue, quota), a warning is shown and your text is still saved locally.

---

### Exam Simulator

The full simulation mode. It chains Listening, Reading, and Writing in sequence, mimicking exam conditions with timers.

**Setup:** Choose which sections to include. You can run all three, or any subset (e.g. just Listening + Reading to skip the AI evaluation wait). Exercises are picked at random from the library for each section.

**During the exam:**

- A header bar shows the current section and position in the sequence (e.g. "Section 2 of 3 · Reading").
- **Listening** — a 40-minute countdown runs from the moment the exercise loads. At exactly 40:00, the app takes a **silent answer snapshot** (a yellow flash and a 📸 badge confirm it). You can keep editing answers after the snapshot. Exercises with a diagram or image show a **two-column layout** (image left, audio player + questions right); clicking the image opens a full-screen **lightbox**. Inline option labels (`A=Label`) in question text are stripped automatically.
- **Reading** — same 60-minute timer and snapshot mechanic. Inline option labels are stripped from question text as in practice mode.
- **Writing** — Task 1 and Task 2 are presented back to back, each with its own editor and word counter. A snapshot of each essay is taken at the standard IELTS time limits (20 min for Task 1, 40 min for Task 2). When Task 1 has a chart image, the layout splits into two columns: the prompt and image (clickable for lightbox) on the left, the writing editor on the right.

**After the last section**, the app evaluates both writing tasks in parallel via the configured AI model. A spinner shows "AI evaluation in progress" with a "skip evaluation" escape hatch if you don't want to wait.

**Results page:**

A summary table lists every section with three columns: score within the time limit, final score, and time spent. Writing rows show the AI band score. Below the table, expandable **AI feedback panels** show per-task analysis (the same strengths/improvements format as Writing Practice).

The entire run is saved as an exam record. Individual Listening and Reading sessions are saved with their question type, and Writing submissions are saved with their AI band score — all feeding into the Analytics dashboard.

---

### Flashcards

A vocabulary trainer built on the **SM-2 spaced-repetition algorithm** — the same algorithm used by Anki. Each card has a scheduled review date that moves further into the future each time you answer correctly, so words you know well stop appearing daily while words you struggle with stay frequent.

#### Adding a card

A **floating 🃏 button** in the bottom-right corner is always visible, on every page. Click it to open the Add modal without navigating away.

You can also **select any text** anywhere in the app (up to 4 words). A small popover appears near the selection with:
- An editable text field pre-filled with your selection
- A 🔊 **pronunciation button** — speaks the text aloud in British English
- A **+ Flashcard** button — opens the Add modal with the word pre-filled

Type any English word and press **Generate**. The AI produces a complete card in a few seconds:

- The word in English and its primary Italian translation
- English synonyms and Italian synonyms (3 each)
- Three example sentences in English with their Italian translations

Every field is editable before saving — useful if the AI picks an obscure meaning or if you want to add a personal note.

#### Review session

Only cards **due today** are included. If you've reviewed everything recently, the session shows "No cards to review today" and you're done.

For each card, the mode is randomly selected:

- **English → Italian** (33% chance) — the English word is shown; type the Italian translation.
- **Italian → English** (33% chance) — the Italian translation is shown; type the English word.
- **Audio** (33% chance) — the word is spoken aloud via text-to-speech (British English accent, slightly slowed). You hear it, you type both the English spelling and the Italian translation. Click the audio area to replay the word at any time.

Pressing **Enter** submits in all modes (including the two audio input fields). The answer is evaluated by the configured AI, which accepts spelling variants and synonyms — you don't have to match the exact translation stored on the card.

**After evaluation**, the result screen shows:
- Correct/incorrect status and a brief explanation from the AI
- English and Italian synonyms as small chips
- All three bilingual example sentences

Then you continue to the next card. A **progress bar** across the top tracks how far through the day's queue you are.

The SM-2 algorithm updates each card silently in the background: a quality score of 1–5 (derived from the AI evaluation) adjusts both the interval until next review and the ease factor that controls how quickly the interval grows.

#### Card library

A scrollable list of every card in your deck. Each entry shows the English word, Italian translation, and either a yellow "today" badge (due for review) or an "interval: N days" badge. Cards can be deleted with a two-step confirmation (click the bin icon, then "Elimina").

---

### Analytics

Deep progress tracking with a selectable time window (7 days, 30 days, or all time).

**Stat cards (6):** sessions completed, average accuracy, total study time, exam simulations run, days active, and current daily streak.

**Estimated band — current:** a prominent card showing your current estimated IELTS band for Listening, Reading, Writing, and Overall. Bands are derived from your recent accuracy and writing AI scores using standard IELTS conversion tables. A highlight card below it calls out your weakest area.

**Band trend over time:** a line chart showing how your estimated Listening and Reading bands have evolved week by week. Useful for spotting a plateau or confirming that practice is paying off.

**Accuracy trend:** a second line chart showing raw accuracy (%) per week for Listening and Reading, making it easy to separate "I'm getting better" from "I'm just doing easier exercises".

**Weekly sessions chart:** a grouped bar chart showing session count per calendar week by section (Listening, Reading, Writing).

**Per-section cards:** one card each for Listening, Reading, and Writing, showing accuracy, number of sessions, and total time invested.

**Accuracy by question type:** a table of every question type that has recorded answers, with accuracy percentage (colour-coded: green ≥ 80%, yellow ≥ 60%, red < 60%), total attempts, average time per question, and a speed trend column showing whether you're answering faster or slower in recent sessions vs. older ones. This is the most actionable view — if `matching_headings` sits at 52% and is getting slower, that's your next drill target.

**Writing bands:** average AI band score for Task 1 and Task 2 separately, with attempt counts.

**Exercise coverage:** progress bars showing how many exercises you've completed at least once out of the total available, per section. Useful for ensuring you're not repeatedly doing the same exercises.

**Flashcard stats:** total cards in your deck, mastered cards (interval ≥ 21 days), cards due today, and overall retention rate (percentage of reviews answered correctly).

All charts use dark-theme styling consistent with the Catppuccin Mocha colour palette.

---

## Application Structure

```
src/
├── main/
│   ├── index.ts         # Electron main process, window creation
│   ├── db.ts            # SQLite schema and migrations (better-sqlite3)
│   ├── ipc.ts           # All IPC handlers (exercises, sessions, AI calls)
│   └── keyStore.ts      # AES-256 key decryption at runtime
├── preload/
│   └── index.ts         # Exposes window.api to the renderer
└── renderer/src/
    ├── App.tsx           # Router, sidebar, floating flashcard/chat buttons, text-selection popover
    ├── i18n/             # Internationalisation setup
    │   ├── index.ts      # i18next init, LANGUAGES list, setLanguage() helper
    │   └── locales/      # it.ts, en.ts, fr.ts, es.ts — all UI strings
    ├── pages/            # One file per route
    │   ├── Dashboard.tsx
    │   ├── Analytics.tsx
    │   ├── Chat.tsx
    │   ├── ExamSimulator.tsx
    │   ├── Flashcard.tsx
    │   └── practice/     # Listening, Reading, Writing
    ├── components/
    │   ├── exam/         # ExamListeningSection, ExamReadingSection, ExamWritingSection
    │   ├── flashcard/    # ReviewSession, CardLibrary, AddCardModal
    │   └── practice/     # AudioPlayer, QuestionInput, ReadingPassage, ResultsPanel, WritingEditor, WritingFeedback, utils
    └── types/index.ts    # All shared TypeScript interfaces and the IElectronAPI contract
```

---

## Local Database

SQLite file stored in the OS user data directory (resolved via Electron's `app.getPath('userData')`). All writes use WAL mode for reliability.

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/IELTS Study/` |
| Windows | `%APPDATA%\IELTS Study\` |
| Linux | `~/.config/IELTS Study/` |

| Table | What it records |
|-------|----------------|
| `sessions` | Every completed Listening/Reading exercise: exercise ID, section, start/end timestamps, score, max score, time spent, question type |
| `answers` | Each question's user answer, correct answer, and correctness flag, linked to its session |
| `writing_submissions` | Full essay text, word count, task ID and type, submission timestamp, AI band score |
| `exam_runs` | Per-simulation record with timestamps and Listening/Reading/Writing scores |
| `flashcards` | Vocabulary cards with SM-2 scheduling fields (interval, ease_factor, repetitions, next_review) |
| `flashcard_reviews` | Every individual review with direction, user answer, quality score, and correctness |
| `chats` | Named AI tutor conversations with creation and last-update timestamps |
| `chat_messages` | Each message in a chat, with role (user/assistant), content, and timestamp |
| `settings` | Key/value store for app preferences — currently used to persist the selected interface language |

Schema migrations run automatically on startup using `ALTER TABLE … ADD COLUMN` wrapped in try/catch, so existing databases are upgraded without data loss.

---

## Internationalisation

The entire UI is translated into four languages: **Italian (it), English (en), French (fr), Spanish (es)**.

A language switcher in the sidebar lets you change language at any time. The selection is written to the `settings` table in SQLite and restored automatically on the next launch. English is the default on a fresh install.

All translations live in `src/renderer/src/i18n/locales/`. Each file is a typed TypeScript `export default` object — no JSON, no missing-key surprises at compile time. i18next pluralisation (`_one` / `_other`) and interpolation (`{{variable}}`) are used where needed.

---

## AI Integration

All AI calls run from the Electron **main process** over IPC, so the API key is never exposed to the renderer. The provider and model are fully configurable via `.env` — no code changes required to switch.

**Supported providers:** `anthropic`, `google`, `openai` (powered by the [Vercel AI SDK](https://sdk.vercel.ai))

```bash
# Example configurations
AI_PROVIDER=anthropic  AI_MODEL=claude-haiku-4-5-20251001  # fast, cheap
AI_PROVIDER=google     AI_MODEL=gemini-2.0-flash
AI_PROVIDER=openai     AI_MODEL=gpt-4o-mini
```

| Call | When it fires | What the model does |
|------|--------------|---------------------|
| `generateFlashcard` | User clicks "Generate" in the Add modal | Returns translation, synonyms, and example sentences as JSON |
| `evaluateAnswer` | Flashcard text-mode review submission | Judges translation correctness, assigns a quality score (1–5), suggests alternatives |
| `evaluateAudioAnswer` | Flashcard audio-mode review submission | Separately judges English spelling and Italian translation |
| `evaluateWriting` | Writing practice or exam submission | Acts as an IELTS examiner, returns band, summary, strengths, improvements, vocab |

AI responses are parsed with a character-level JSON fixer that handles literal newlines and other formatting quirks common in streamed model output — all four handlers share the same `parseAiJson<T>()` utility.

The API key is stored encrypted (`resources/env.enc`, AES-256) and decrypted at runtime. The build script (`scripts/encrypt-env.js`) encrypts the `.env` before packaging so the key is never shipped in plaintext.

---

## Content Summary

| Section | Exercises | Question types / formats |
|---------|-----------|--------------------------|
| Listening | 41 | gap fill, form completion, multiple choice, map/diagram, table |
| Reading | 32 | T/F/NG, Y/N/NG, matching headings, matching paragraph info, multiple choice, sentence completion, summary completion, short answer |
| Writing Task 1 | 7 | bar, line, pie, table, map, process |
| Writing Task 2 | 13 | opinion, discussion, problem/solution, direct question, advantages/disadvantages |

---

## Building for Distribution

```bash
# macOS (produces a .dmg in dist/)
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

The build script encrypts the `.env` file before calling `electron-builder`, so the final binary contains the encrypted key but not the raw `.env`.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Electron | 39 |
| Frontend framework | React + TypeScript | 19 / 5.9 |
| Styling | Tailwind CSS v4 (Catppuccin Mocha theme) | 4.3 |
| Routing | React Router | 7 |
| Charts | Recharts | 3 |
| Database | better-sqlite3 | 12 |
| Internationalisation | i18next + react-i18next | 25 / 15 |
| AI | Vercel AI SDK (Anthropic / Google / OpenAI) | 6 |
| Build tooling | electron-vite + electron-builder | 5 / 26 |
| Testing | Vitest | 4 |
