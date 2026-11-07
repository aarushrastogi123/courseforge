# CourseForge

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

Copy `.env.example` to `.env.local` and add provider keys to enable custom-topic research and generation. Keep these values server-side; never add a `NEXT_PUBLIC_` prefix. Restart the development server after changing keys.

- `GEMINI_API_KEY` — preferred model for lesson generation and model-assisted QC
- `GEMINI_MODEL` — optional primary Gemini model ID (defaults to `gemini-3.8-flash`)
- `GEMINI_FALLBACK_MODEL` — optional fallback Gemini model ID for temporary rate limits or server overload (defaults to `gemini-3.5-flash-lite`)
- `OPENAI_API_KEY` — optional fallback model if Gemini is not configured
- `OPENAI_MODEL` — optional OpenAI model ID (defaults to `gpt-6-luna`)
- `TAVILY_API_KEY` — live web search and excerpts
- `YOUTUBE_API_KEY` — YouTube Data API search; enable YouTube Data API v3 for the key

Open Library book catalog lookup does not require a key. Book search returns catalog records, not full book text; YouTube search returns video metadata and descriptions, not transcripts. Those sources are listed as references and are not presented as verified evidence for individual claims. Provider usage may incur charges or have quotas; configure keys under the relevant provider account. The app reports provider readiness without exposing secret values.
