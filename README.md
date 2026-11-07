<div align="center">

<img src="public/courseforge-logo.png" alt="CourseForge logo" width="156" />

# CourseForge

### A focused workspace for building, reviewing, and exporting instructor-ready lessons.

Turn a lesson title and learning objective into a research-informed **45-minute lesson draft**, two separate quality reports, and polished Word documents.

<br />

![Next.js 16](https://img.shields.io/badge/Next.js-16-111111?logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Minecraft-inspired UI](https://img.shields.io/badge/Interface-Minecraft--inspired-4C7C3A)

</div>

---

## The workflow

CourseForge keeps lesson creation in a clear, five-step instructor flow:

| Step | What happens |
|:---:|---|
| **01 · Brief** | Enter a lesson title and a measurable learning objective. |
| **02 · Research** | Gather website results, book catalog records, and YouTube video metadata; prepare a structured lesson draft. |
| **03 · Draft** | Review the 45-minute lesson, its explanations, examples, practice, knowledge checks, and references. Edit manually or request an AI revision for one section. |
| **04 · Quality** | Run a research and factual evidence review, then a separate instructional quality review. Inspect findings and recommendations. |
| **05 · Export** | Preview the revised lesson and both audit reports; download separate Word documents. |

### Built for instructor review

- Lesson sections are checked for a total duration of **45 minutes**.
- Generation is asked to include explanations, labeled examples, practical applications, knowledge checks, answer keys, and evidence-linked claims.
- Layer 1 and Layer 2 remain separate reports with their own findings and suggested next steps.
- AI edits are previewed before they are applied. Applying an edit marks both reports pending so the revised lesson can be reviewed again.
- Both checks must be complete before the final document downloads are enabled.
- Briefs, lesson edits, and QC reports are saved in the current browser’s local storage.

## Try it locally

### Requirements

- Node.js **20.9+**
- npm

### Install and run

```bash
git clone <your-repository-url>
cd <repository-folder>
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The curated HTTP and Git example lessons can be tried without AI or live research credentials. Custom-topic research requires provider configuration as described below.

## Configure AI and research

1. Copy `.env.example` to `.env.local` in the project root.
2. Add the appropriate provider keys and select a provider if needed.
3. Restart the development server after changing environment variables.

Keep all credentials server-side. Do not use `NEXT_PUBLIC_` prefixes, commit `.env.local`, or paste secrets into the browser or source files.

### AI provider variables

Credentials are specific to each provider. Set `AI_PROVIDER` to `gemini`, `anthropic`, `openai`, or `openai-compatible`. If `AI_PROVIDER` is blank, CourseForge selects the first configured key in that order: Gemini, Anthropic, OpenAI, then OpenAI-compatible.

| Provider | Environment variables | Notes |
|---|---|---|
| **Gemini** | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Fallback model is used for eligible temporary service failures. |
| **Claude** | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Uses Anthropic’s Messages API. |
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_MODEL` | Use an OpenAI Platform API key. “Codex” does not have a separate general-purpose API key for this app. |
| **OpenAI-compatible service** | `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL` | The endpoint must accept the Chat Completions request format used by CourseForge. `AI_API_KEY` and `AI_MODEL` are also accepted as key/model aliases. |

Default models and the full workflow are documented in [`docs/PROJECT_WORKFLOW.md`](docs/PROJECT_WORKFLOW.md). Model availability and access depend on the configured account and provider.

### Live research variables

| Variable | Purpose |
|---|---|
| `TAVILY_API_KEY` | Search the web and retrieve result excerpts. |
| `YOUTUBE_API_KEY` | Search YouTube using YouTube Data API v3. |
| `OPEN_LIBRARY_CONTACT` | Optional contact information appended to the Open Library request’s User-Agent. |

Open Library catalog search does not require a key. Custom-topic generation needs an AI provider, web search, and YouTube search configured, with usable results available from each source category.

## What the checks mean

- **Layer 1 · Research and factual accuracy** can compare claims with available website excerpts when model review is available. If it cannot run in that mode, the report may use heuristic checks of links and reference metadata. Neither report mode proves a fact is true.
- **Layer 2 · Instructional quality** reviews objective alignment, clarity, sequencing, practice, knowledge checks, and pacing when model-assisted review is available; heuristic checks cover programmed structure and timing.
- If a model review fails, the interface can offer transparent heuristic checks for that layer. Reports show which review method was used.
- Book results are catalog records, not full book text. YouTube results are metadata and descriptions, not transcripts. Web results and excerpts can be incomplete or unsuitable. Instructors should open and assess sources before teaching.

CourseForge does not claim that AI-generated content, retrieved sources, or QC findings have been independently verified.

## Documents

The final step provides two separate `.docx` downloads:

1. **Final lesson** — lesson context, section sequence and timing, teaching content, activities, knowledge checks, and references.
2. **Quality reports** — both completed audit reports, their findings and recommendations, and the reference register.

Exports are gated until both reviews are complete for the current lesson.

## Data and privacy notes

- The current workspace saves the brief and draft in **local storage for that browser on that device**. It does not provide accounts, cloud persistence, or cross-device sync.
- Model and research credentials are read by server routes and are not returned as readiness values to the browser.
- Briefs, retrieved excerpts, and section context are sent to the configured external search or AI provider when their corresponding workflow action runs.

## Project map

```text
src/
├── app/
│   ├── api/lessons/       # Drafting, QC, section editing, and Word export routes
│   ├── globals.css        # Responsive Minecraft-inspired visual theme
│   └── page.tsx           # Five-step workflow and browser persistence
├── components/lesson/     # Brief form, draft editor, and QC reports
└── lib/
    ├── ai/                 # Provider selection and model adapters
    ├── lesson/             # Lesson types, sample lessons, and QC logic
    └── research/           # Live research and source handling

docs/                      # Workflow and implementation notes
design-system/courseforge/ # Product visual and interaction rules
```

## Development commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Run the production server. |
| `npm run lint` | Run ESLint. |

## More project notes

- [Complete step-by-step workflow](docs/PROJECT_WORKFLOW.md)
- [Project plan](PROJECT_PLAN.md)
- [CourseForge design system](design-system/courseforge/MASTER.md)

---

<div align="center">

**CourseForge** · A practical lesson-building workspace for instructors

</div>
