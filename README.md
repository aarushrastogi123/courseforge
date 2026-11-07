# CourseForge

See [docs/PROJECT_WORKFLOW.md](docs/PROJECT_WORKFLOW.md) for the complete step-by-step instructor workflow, application routes, persistence behavior, and known boundaries.

A focused instructor workspace for researching, reviewing, editing, and exporting 45-minute lessons. Curated HTTP and Git examples work without provider credentials; custom topics use live source search and model-backed generation when configured.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Requirements

- Node.js 20.9 or newer
- npm

## Project status

Custom-topic research uses Tavily for web results, Open Library for book catalog records, and YouTube Data API for videos. Gemini generates a lesson from returned source metadata and excerpts when its key is configured; OpenAI remains an optional fallback if no Gemini key is present. Book catalog records are not treated as full text. Layer 1 uses the available website excerpts when present and reports evidence gaps; Layer 2 reviews instructional quality. Model-assisted checks are advisory and are not proof of factual accuracy. Without model or search keys, both curated examples remain available and QC uses transparent heuristics. Instructors can review findings, load proposed edits into the editor, save changes in this browser, rerun both reports, preview, and export the lesson, source excerpts, references, and reports as Markdown.

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the build sequence.
Design decisions are recorded in [design-system/courseforge/MASTER.md](./design-system/courseforge/MASTER.md).

## Structure

- `src/app/` — app layout, brief screen, and global styles
- `src/lib/lesson/` — shared lesson types, sample brief, and input validation
- `src/lib/research/providers/` — curated examples and live research adapters
- `src/lib/ai/` — server-only model integration
- `src/app/api/lessons/` — lesson draft endpoint
- `design-system/courseforge/` — product-wide and workspace design rules
- `.agents/skills/` — project-local UI/UX guidance

## Configuration

Copy `.env.example` to `.env.local` and configure one model provider for generation and model-assisted QC. Keep keys server-side; never add a `NEXT_PUBLIC_` prefix. Restart the development server after changing keys. Credentials are provider-specific. `AI_PROVIDER` can be `gemini`, `anthropic`, `openai`, or `openai-compatible`; if omitted, the app selects the first configured key in that order (Gemini, Claude, OpenAI, compatible).

- `AI_PROVIDER` — explicitly selects the provider when multiple keys are configured
- `GEMINI_API_KEY` — Gemini key; used with `GEMINI_MODEL` and optional `GEMINI_FALLBACK_MODEL`
- `GEMINI_MODEL` — optional primary Gemini model ID (defaults to `gemini-3.8-flash`)
- `GEMINI_FALLBACK_MODEL` — optional fallback Gemini model ID for temporary rate limits or server overload (defaults to `gemini-3.5-flash-lite`)
- `ANTHROPIC_API_KEY` — Claude API key; `ANTHROPIC_MODEL` selects its model (defaults to `claude-sonnet-5`)
- `OPENAI_API_KEY` — OpenAI Platform API key; `OPENAI_MODEL` selects its model (defaults to `gpt-6-luna`). Codex does not use a separate general-purpose API key; use an OpenAI Platform key here.
- `OPENAI_MODEL` — optional OpenAI model ID (defaults to `gpt-6-luna`)
- `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL` — credentials, base URL, and model for a service implementing the OpenAI Chat Completions API. `AI_API_KEY` and `AI_MODEL` are accepted as key/model aliases for this provider.
- `TAVILY_API_KEY` — live web search and excerpts
- `YOUTUBE_API_KEY` — YouTube Data API search; enable YouTube Data API v3 for the key

Open Library book catalog lookup does not require a key. Book search returns catalog records, not full book text; YouTube search returns video metadata and descriptions, not transcripts. Those sources are listed as references and are not presented as verified evidence for individual claims. Provider usage may incur charges or have quotas; configure keys under the relevant provider account. The app reports provider readiness without exposing secret values.
