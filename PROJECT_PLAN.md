# Kalvium AI Research Intern Assignment — Remaining Work Plan

Final submission packaging and demo-video creation are intentionally out of scope for this plan.

## Goal

Complete the instructor workflow in the assignment while preserving the current interface and existing HTTP and Git examples. Live research and model-backed functions must be labeled accurately, require server-side credentials, and fail safely when a provider is unavailable.

## Implementation sequence

### 1. Provider foundation — implemented

- Add server-only provider adapters for web search, book search, YouTube search, and structured lesson generation.
- Read API keys from `.env.local`; expose only readiness state to the interface.
- Keep the existing curated examples available without credentials.
- Show recoverable configuration/provider errors without losing the instructor's brief or saved draft.
- Status: keys are read only on the server. No keys are configured in this workspace, so readiness is reported as unavailable.

### 2. Research-backed draft generation — implemented; live model retry pending

- Retrieve web results with excerpts, book catalog records, and YouTube videos for arbitrary briefs.
- Preserve source type, title, publisher/creator, URL, retrieval date, and available excerpt.
- Generate sections whose timings total 45 minutes, with explanations, examples, practical applications, and knowledge checks.
- Validate model output and citation IDs before saving; reject malformed or unsupported output instead of inventing content or references.
- Status: HTTP and Git examples were exercised successfully. The live provider selection prefers Gemini when its key is configured. A DNS-topic attempt reached Gemini, which returned HTTP 503 due to high demand; no generated draft was returned. Manual retry is available.

### 3. Two stronger QC layers — implemented

- Layer 1 compares claim text with retrieved source excerpts, flags insufficient evidence and source gaps, and keeps the instructor responsible for final verification.
- Layer 2 reviews measurable-objective alignment, clarity, sequencing, examples, applications, checks for understanding, and 45-minute pacing.
- Keep the reports separate, record whether a report used heuristics or a model, and return actionable issues and suggestions.
- Status: curated drafts use clearly labeled heuristics; drafts with retrieved excerpts can use model-assisted review.

### 4. Review, apply, save, and export — implemented

- Show proposed text changes for instructor review before use.
- Load a selected change into the editor; require the instructor to save it, then rerun both reports.
- Preserve edits through provider and QC errors, retries, and refreshes.
- Keep preview and package export inclusive of the final lesson, references, and both reports; require current reports before finalized export.

### 5. Verification — sample paths complete; credentialed paths pending

- Run type and lint checks.
- Exercise HTTP and Git sample paths plus configured and unconfigured provider paths.
- Check 45-minute timing, citations, independent QC layers, recommendation editing, persistence, and export gating.
- Status: TypeScript and lint pass after adding Gemini support. HTTP and Git both return 45-minute outlines; heuristic QC stays separate; finalized Markdown export succeeds after both reports. Provider readiness reports Gemini as the selected model provider. A complete Gemini generation and QC walkthrough remains pending because the model returned HTTP 503.

## Current state

The app must not read, display, or disclose the contents of .env.local to the instructor workspace. Provider readiness only indicates that required keys are present; it does not check billing or provider quota. The current Gemini attempt stopped because the selected model reported high demand. Final submission materials remain excluded as requested.
