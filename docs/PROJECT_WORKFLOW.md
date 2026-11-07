# CourseForge: Project Workflow

This document records how the current CourseForge application works from instructor input through document export. It describes implemented behavior in the codebase; it is not a claim that sources or AI output are independently verified.

## 1. Start the application

1. Install project dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and configure the server-side provider credentials needed for the desired workflow. Never add a `NEXT_PUBLIC_` prefix to secrets.
3. Start the development server with `npm run dev` and open the local URL it prints.
4. The browser workspace stores the brief and lesson draft in local storage on that device. It is not a shared account or cloud database.

For AI provider options and environment variable names, see the Configuration section in the root README.

## 2. Instructor journey

The application is a five-step, screen-by-screen workflow. The progress indicator shows the current step; there is no section navigation bar.

### Step 1 — Lesson brief

1. Enter a focused lesson title.
2. Enter the learning objective describing what learners should be able to explain or do.
3. Select **Build lesson draft**. The brief is validated and written to browser local storage before the request begins.
4. The HTTP and Git examples are prewritten sample lessons. They can be opened without live AI generation and are labelled as curated samples in the draft.
5. Other topics use the live-research pipeline and require an AI provider, Tavily web search, and YouTube Data API configuration.

### Step 2 — Research and draft preparation

1. The screen displays the in-progress state while the server handles the request.
2. For a custom topic, the server searches the web with Tavily, searches the Open Library catalog, and searches YouTube.
3. A custom lesson is not generated unless at least one usable result is available from each source category, and at least one website result contains a readable excerpt.
4. Open Library results are catalog metadata, not full book text. YouTube results contain metadata and descriptions, not transcripts. Website search excerpts are not proof that a claim is accurate.
5. The configured AI model receives the brief and retrieved records. It is instructed to produce 3–8 sections totaling exactly 45 minutes, with explanations, labeled examples, practical applications, knowledge checks, answer keys, and website evidence links for factual claims.
6. The server validates the returned structure, timing, required lesson elements, and source IDs before returning the draft.
7. On success, the draft is stored in browser local storage and the workflow moves to Step 3. On failure, the screen reports the error and offers retry or a return to the brief. The saved brief remains available.

### Step 3 — Lesson draft

1. Review the objective, lesson sections, section timings, teaching purposes, explanations, source links, claims, and available source excerpts.
2. Use **Edit lesson** to edit the brief, section heading, teaching purpose, or lesson content directly. **Save changes** preserves the edits locally and invalidates both earlier QC reports; **Cancel** discards the unsaved working copy.
3. To use AI on one section, open its prompt, describe the desired revision, and choose **Make changes with AI**. The API returns a preview. The lesson is unchanged until **Apply changes and rerun quality checks** is selected. The applied content is saved and both QC reports return to pending.
4. Failed generation leaves the saved lesson unchanged and allows another attempt.
5. Continue to Step 4 when ready.

### Step 4 — Quality checks

Run the two layers independently. Each report is saved with the browser’s lesson draft.

1. **Layer 1 — Research and factual accuracy:** when the selected AI reviewer can run and the lesson has website evidence excerpts, the model compares listed claims and section assertions against those excerpts. Otherwise, the report is explicitly a heuristic review of citation/link and reference metadata; it does not inspect source facts. Neither mode proves factual accuracy.
2. **Layer 2 — Instructional quality:** when model review is available, it reviews objective alignment, clarity, sequence, application, knowledge checks, and pacing. If not, the heuristic checks structure and timing.
3. Findings show severity, location, explanation, recommendation, and (when safely available) suggested wording. Selecting a suggested edit opens the prompt for a relevant section; the instructor reviews the model preview before applying it.
4. If an AI review request fails, the error is shown with an option to run the transparent heuristic checks for that layer instead. A failed review does not overwrite the lesson.
5. After any applied AI change or saved manual edit, rerun both layers. Export is enabled only when both reports are complete for the current brief and lesson.

### Step 5 — Final preview and export

1. Review the finalized lesson and both completed audit reports in the preview.
2. Download **Final lesson** as a Word `.docx` document containing the lesson flow, timing, activities, knowledge checks, and references.
3. Download **Quality reports** as a separate Word `.docx` document containing the two audit reports, findings, recommendations, and reference register.
4. The server rejects export requests if the lesson structure is invalid or either audit is pending. If document creation fails, the UI offers a retry; the saved lesson remains intact.

## 3. AI provider selection

Generation, section prompting, and model-assisted QC share the server-side model adapter in `src/lib/ai/model.ts`.

- Gemini uses the Gemini `generateContent` API and can retry with the configured Gemini fallback model for eligible transient failures.
- Claude uses the Anthropic Messages API.
- OpenAI uses the OpenAI Chat Completions API.
- OpenAI-compatible mode sends a Chat Completions request to a configured compatible base URL.
- `AI_PROVIDER` selects a provider explicitly. If it is omitted, the server selects the first available credential in this order: Gemini, Anthropic, OpenAI, then OpenAI-compatible. An explicit selection with a missing credential does not silently switch provider.
- Credentials are specific to their provider and protocol. “Codex API key” is not a separate general-purpose provider credential; use an OpenAI Platform key for the OpenAI adapter.

API keys are read by server code only. Do not paste them into the browser, source code, documentation, or a public repository.

## 4. Application routes and responsibilities

| Route | Purpose |
| --- | --- |
| `GET /api/lessons` | Reports server-side research/provider readiness without returning secret values. |
| `POST /api/lessons` | Validates a brief; returns a matching curated sample or performs live research and generates a custom lesson. |
| `POST /api/lessons/qc` | Runs one requested QC layer and returns its audit report. |
| `POST /api/lessons/edit-section` | Generates a proposed replacement for one selected section; it does not save or apply it. |
| `POST /api/lessons/export` | Validates the lesson and both completed QC reports, then returns one Word document. |

## 5. Persistence, privacy, and recovery behavior

- The brief and lesson, including instructor edits and QC reports, are saved in browser local storage on the current device/browser profile.
- The application does not currently provide user accounts, server-side draft storage, or cross-device synchronization.
- Network, provider, validation, and export errors are surfaced in the interface with retry paths where applicable. The client retains the latest saved work when these requests fail.
- AI provider credentials remain server-side. Lesson briefs, source excerpts, and the selected section context are sent to the configured research/model services as required for the requested operation.

## 6. Implementation map

- `src/app/page.tsx` — five-step state machine, browser persistence, recovery, and main screen composition.
- `src/components/lesson/lesson-brief-form.tsx` — title/objective entry and research readiness.
- `src/components/lesson/lesson-draft-view.tsx` — draft display, manual editing, AI section prompt/review/apply, preview, and downloads.
- `src/components/lesson/quality-review-panel.tsx` — independent QC requests, report display, fallback action, and recommendations.
- `src/lib/research/live-research.ts` — live-source collection, lesson generation, and output validation.
- `src/lib/ai/model.ts` — provider selection and provider-specific model requests.
- `src/lib/lesson/ai-review.ts` and `src/lib/lesson/quality-review.ts` — AI-assisted and heuristic audit behavior.
- `src/app/api/lessons/export/route.ts` — Word document construction and export gates.

## 7. Known boundaries

- The built-in HTTP and Git lessons are static examples, not outputs from current live research.
- Catalog matches, web search excerpts, and video descriptions can be incomplete, irrelevant, outdated, or insufficient to support a claim. Instructors must review sources and findings.
- Model-assisted QC is evidence-limited and is not proof of correctness. Heuristic QC only checks programmed structure/metadata.
- Custom-topic generation requires the configured research providers and selected model provider to be reachable, within quota, and compatible with the configured model.
- OpenAI-compatible services can differ in supported parameters and JSON-mode behavior; the service must accept the request format used by CourseForge.
