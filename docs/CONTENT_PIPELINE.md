# Exercise Content Pipeline

## Ownership and permitted use

Exercise prompts, passages, questions, answer keys, model answers, audio, and supporting images in this project originate from [IELTS Liz](https://ieltsliz.com/). All rights in that material remain with IELTS Liz and its author.

This repository's attribution is not a license to copy, redistribute, publish, sell, or create a public derivative dataset. Before distributing the repository, datasets, screenshots containing exercise text, or packaged application, obtain the permissions required for the intended use. See `THIRD_PARTY_CONTENT.md`.

The project is independent and is not affiliated with or endorsed by IELTS Liz, IELTS, the British Council, IDP, or Cambridge University Press & Assessment.

## Dataset layout

```text
data/
├── listening/exercises.json
├── reading/exercises.json
└── writing/
    ├── task1.json
    └── task2.json
```

The JSON files are the runtime source of truth. Development reads them from the repository; packaged builds copy them into the application resources directory.

Listening and Reading rows retain `source_url`. Writing tasks currently retain remote image URLs but do not consistently include a source URL field, so provenance should be preserved during future schema work.

## Scraper entry point

Run:

```bash
npm run scrape
```

This executes `scripts/scraper/index.ts`, which sequentially runs Listening, Reading, and Writing collectors and then overwrites all four dataset files.

Important: the command is not an incremental update. Back up or commit the existing datasets before running it so the generated diff can be reviewed and reverted.

## Collector behavior

### Listening

- Iterates a hardcoded list of IELTS Liz URLs.
- Waits 1.5 seconds after each request.
- Uses a 15-second HTTP timeout.
- extracts page title, audio URL, inferred question type, questions, and answers;
- falls back to generated question labels when answers are found without question text;
- caps each extracted exercise at 40 questions;
- assigns medium difficulty.

### Reading

- Iterates a hardcoded source list.
- extracts a passage from a blockquote or substantial page paragraphs;
- infers question type from title, URL, and initial page text;
- uses type-specific extraction for T/F/NG and matching headings;
- falls back to numbered paragraphs and generated labels;
- caps each exercise at 40 questions;
- assigns medium difficulty.

The current inference maps Yes/No/Not Given text into the scraper's `true_false_ng` branch, while the application supports a distinct `yes_no_ng` type. Review this classification manually.

### Writing

- Discovers Task 1 links from the IELTS Liz Task 1 hub and inspects at most 20 links.
- extracts prompt, first content image, inferred chart type, model answer, and a default target band of 7;
- collects Task 2 prompts from the essay-question page and discovered Task 2 links;
- infers essay type heuristically;
- initializes vocabulary/phrase arrays empty when they cannot be extracted.

## Required manual review

Scraping is heuristic and must never be treated as publication-ready without review. After every run:

1. inspect the full Git diff;
2. verify every source URL and title;
3. check that IDs are stable and unique;
4. confirm passages are complete and exclude menus, tips, or answer blocks;
5. verify every question is paired with the correct answer;
6. confirm multiple-choice options and multi-select answers are represented correctly;
7. distinguish True/False/Not Given from Yes/No/Not Given;
8. validate that audio and image URLs resolve over HTTPS;
9. inspect copyright/permission status for every new asset;
10. run typecheck, tests, a development smoke test, and a production build.

Useful automated validations to add:

- JSON Schema or Zod validation for each file;
- duplicate ID/source detection;
- empty title, passage, prompt, answer, and media checks;
- allowed enum validation;
- question-index uniqueness and contiguity;
- HTTP link checker with rate limiting;
- content-count snapshots requiring explicit approval.

## Responsible collection

- Respect the site's terms, robots directives, and rate limits.
- Keep request rates low and identify the tool honestly if the site requests it.
- Do not bypass authentication, paywalls, access controls, or technical restrictions.
- Stop collection if requested by the rights holder.
- Avoid repeatedly downloading unchanged media.
- Preserve provenance and review dates.

## Updating content safely

Recommended workflow:

```text
create branch
  → back up existing JSON
  → run scraper once
  → validate generated files
  → manually correct extraction
  → confirm rights/provenance
  → run app and tests
  → review content diff separately from code diff
```

Do not combine a broad scraper refresh with unrelated application changes. Dataset diffs are large and deserve an isolated review.

