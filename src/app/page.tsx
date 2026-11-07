"use client";

import { startTransition, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { LessonBriefForm } from "@/components/lesson/lesson-brief-form";
import { LessonDraftView } from "@/components/lesson/lesson-draft-view";
import { GIT_SAMPLE_LESSON_BRIEF, SAMPLE_LESSON_BRIEF, validateLessonBrief, type LessonBriefErrors } from "@/lib/lesson/brief";
import type { LessonBrief, LessonDraft } from "@/lib/lesson/types";

const BRIEF_STORAGE_KEY = "courseforge.brief.v1";
const LESSON_STORAGE_KEY = "courseforge.lesson.v1";
const LEGACY_BRIEF_STORAGE_KEY = "kalvium-lesson-studio.brief.v1";
const LEGACY_LESSON_STORAGE_KEY = "kalvium-lesson-studio.lesson.v1";
const workflow = ["Lesson brief", "Research", "Lesson draft", "Quality checks", "Export"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLessonDraft(value: unknown): value is LessonDraft {
  if (!isRecord(value) || !isRecord(value.brief)) return false;
  return typeof value.id === "string" && typeof value.brief.title === "string" && typeof value.brief.learningObjective === "string" &&
    isRecord(value.qualityReports) && isRecord(value.qualityReports["factual-accuracy"]) && isRecord(value.qualityReports["instructional-quality"]) &&
    Array.isArray(value.sections) && Array.isArray(value.sources);
}

export default function Home() {
  const [brief, setBrief] = useState<LessonBrief>({ title: "", learningObjective: "" });
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [errors, setErrors] = useState<LessonBriefErrors>({});
  const [notice, setNotice] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasBuildError, setHasBuildError] = useState(false);
  const [isUnsupportedBrief, setIsUnsupportedBrief] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [promptSectionId, setPromptSectionId] = useState<string | null>(null);
  const [promptInstruction, setPromptInstruction] = useState("");
  const [researchReadiness, setResearchReadiness] = useState<{ ready: boolean; missing: string[]; aiProvider: "gemini" | "anthropic" | "openai" | "openai-compatible" | null } | null>(null);

  useEffect(() => {
    try {
      const savedBrief = window.localStorage.getItem(BRIEF_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_BRIEF_STORAGE_KEY);
      if (savedBrief) {
        const parsed = JSON.parse(savedBrief) as Partial<LessonBrief>;
        if (typeof parsed.title === "string" && typeof parsed.learningObjective === "string") {
          const restoredBrief = { title: parsed.title, learningObjective: parsed.learningObjective };
          startTransition(() => { setBrief(restoredBrief); setNotice("Your saved lesson brief is ready to continue."); });
          window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(restoredBrief));
        }
      }
      const savedLesson = window.localStorage.getItem(LESSON_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_LESSON_STORAGE_KEY);
      if (savedLesson) {
        const parsed: unknown = JSON.parse(savedLesson);
        if (isLessonDraft(parsed)) {
          startTransition(() => { setLessonDraft(parsed); setCurrentStep(3); });
          window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch {
      startTransition(() => setNotice("A saved item could not be read. Your current entries are still available."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lessons", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { liveResearch?: { ready?: boolean; missing?: string[]; aiProvider?: "gemini" | "anthropic" | "openai" | "openai-compatible" | null } }) => {
        if (!cancelled && payload.liveResearch) setResearchReadiness({ ready: Boolean(payload.liveResearch.ready), missing: payload.liveResearch.missing ?? [], aiProvider: payload.liveResearch.aiProvider ?? null });
      })
      .catch(() => { if (!cancelled) setResearchReadiness({ ready: false, missing: ["research providers unavailable"], aiProvider: null }); });
    return () => { cancelled = true; };
  }, []);

  const isCurrentDraft = Boolean(lessonDraft && lessonDraft.brief.title.trim() === brief.title.trim() && lessonDraft.brief.learningObjective.trim() === brief.learningObjective.trim());
  const qualityReviewsComplete = Boolean(isCurrentDraft && lessonDraft?.qualityReports["factual-accuracy"].status === "complete" && lessonDraft?.qualityReports["instructional-quality"].status === "complete");

  function updateBrief(field: keyof LessonBrief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setIsUnsupportedBrief(false);
    setHasBuildError(false);
    setNotice("");
    if (currentStep > 1 && currentStep !== 2) setCurrentStep(1);
  }

  function useSampleBrief(sample: LessonBrief = SAMPLE_LESSON_BRIEF) {
    setBrief(sample);
    setErrors({});
    setHasBuildError(false);
    setIsUnsupportedBrief(false);
    setNotice(sample === GIT_SAMPLE_LESSON_BRIEF ? "Git example loaded. Build the draft when ready." : "HTTP example loaded. Build the draft when ready.");
  }

  async function saveBrief(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextErrors = validateLessonBrief(brief);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setNotice("Complete both fields before building a lesson draft.");
      setCurrentStep(1);
      return;
    }
    const cleanBrief = { title: brief.title.trim(), learningObjective: brief.learningObjective.trim() };
    setBrief(cleanBrief);
    setHasBuildError(false);
    setIsUnsupportedBrief(false);
    let briefSavedLocally = true;
    let canRetry = true;
    try { window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(cleanBrief)); } catch { briefSavedLocally = false; }
    setIsBuilding(true);
    setCurrentStep(2);
    setNotice("Brief saved. Preparing research and lesson content…");
    try {
      const response = await fetch("/api/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanBrief) });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 422) { canRetry = false; setIsUnsupportedBrief(true); }
        const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : "The lesson draft could not be prepared. Your brief is saved; you can retry.";
        throw new Error(message);
      }
      if (!isRecord(payload) || !isLessonDraft(payload.lesson)) throw new Error("The lesson service returned an unreadable draft. Please retry.");
      const lesson = payload.lesson;
      setLessonDraft(lesson);
      try { window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(lesson)); } catch { setNotice("Draft ready, but browser storage is unavailable. Keep this tab open to retain it."); }
      setCurrentStep(3);
      setNotice(briefSavedLocally ? "Lesson draft saved in this browser." : "Draft ready. Browser storage is unavailable, so it will not persist after this tab closes.");
    } catch (error) {
      setHasBuildError(canRetry);
      setNotice(error instanceof Error ? `${error.message} ${briefSavedLocally ? "Your brief is saved; retry when ready." : "Your brief is still in this tab; browser storage is unavailable."}` : "The lesson draft could not be prepared. Your brief is saved; you can retry.");
    } finally { setIsBuilding(false); }
  }

  function updateLesson(updated: LessonDraft) {
    setLessonDraft(updated);
    setBrief(updated.brief);
    try {
      window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(updated));
      window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(updated.brief));
      setNotice("Lesson changes and review results are saved on this device.");
    } catch { setNotice("The lesson is updated, but browser storage is unavailable. Keep this tab open to retain it."); }
  }

  function openSectionPrompt(sectionId: string, instruction = "") {
    setPromptSectionId(sectionId);
    setPromptInstruction(instruction);
    setCurrentStep(3);
  }

  function renderLesson(view: "draft" | "quality" | "export") {
    if (!lessonDraft || !isCurrentDraft) return null;
    return <LessonDraftView lesson={lessonDraft} view={view} isCurrent={isCurrentDraft} onLessonUpdate={updateLesson} onReturnToQuality={() => setCurrentStep(4)}
      promptSectionId={promptSectionId} initialPrompt={promptInstruction} onPromptClosed={() => { setPromptSectionId(null); setPromptInstruction(""); }}
      onOpenSectionPrompt={openSectionPrompt} />;
  }

  return (
    <div className="studio-shell minecraft-shell">
      <a className="skip-link" href="#main-content">Skip to current step</a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="CourseForge home" onClick={(event) => { event.preventDefault(); setCurrentStep(1); }}>
          <Image className="brand-logo" src="/courseforge-logo.png" alt="CourseForge" width={472} height={472} priority />
        </Link>
        <div className="workspace-status"><span className="status-dot" aria-hidden="true" />Local workspace</div>
      </header>

      <div className="workflow-progress" role="group" aria-label="Workflow progress">
        <div className="workflow-progress-label"><span>STEP {String(currentStep).padStart(2, "0")} OF 05</span><strong>{currentStep === 2 && isBuilding ? "Research in progress" : workflow[currentStep - 1]}</strong></div>
        <div className="workflow-progress-track" role="progressbar" aria-label={`Step ${currentStep} of 5: ${workflow[currentStep - 1]}`} aria-valuemin={1} aria-valuemax={5} aria-valuenow={currentStep}>
          {workflow.map((label, index) => <span key={label} className={`workflow-progress-segment ${index + 1 <= currentStep ? "is-filled" : ""}`} aria-hidden="true" />)}
        </div>
      </div>

      <main className="content-wrap" id="main-content" tabIndex={-1}>
        <div className="step-overline"><span className="pixel-cube" aria-hidden="true" />COURSEFORGE WORKSPACE</div>
        {currentStep === 1 && <>
          <div className="page-intro"><p className="eyebrow">LESSON BRIEF</p><h1>Plan a focused 45-minute lesson.</h1><p className="intro-copy">Start with the outcome learners should reach. CourseForge will research, draft, and prepare two separate quality reviews.</p></div>
          <div className="workspace-grid brief-workspace">
            <LessonBriefForm brief={brief} errors={errors} notice={notice} isBuilding={isBuilding} hasBuildError={hasBuildError} unsupportedBrief={isUnsupportedBrief} researchReadiness={researchReadiness} onChange={updateBrief} onUseSample={useSampleBrief} onSubmit={saveBrief} />
            <aside className="workflow-aside" aria-label="Workflow details"><p className="eyebrow">WORKFLOW</p><h2>From brief to reviewed lesson.</h2><ol><li><span>01</span>Enter a title and measurable objective.</li><li><span>02</span>Research relevant books, websites, and videos.</li><li><span>03</span>Review content and run both QC layers.</li><li><span>04</span>Download Word documents when both reviews are complete.</li></ol><p className="aside-note">Saved drafts and your edits stay in this browser.</p></aside>
          </div>
        </>}

        {currentStep === 2 && <section className="loading-page" aria-labelledby="loading-heading" aria-live="polite">
          <span className="loading-cube" aria-hidden="true" /><p className="eyebrow">RESEARCH IN PROGRESS</p>
          <h1 id="loading-heading">Preparing your lesson.</h1>
          <p className="intro-copy">Your brief is saved. CourseForge is gathering research and structuring the lesson around its objective and 45-minute limit.</p>
          <div className={`loading-status ${hasBuildError ? "has-error" : ""}`}><span className="loading-indicator" aria-hidden="true" /><span>{isBuilding ? "Working on your lesson draft…" : hasBuildError ? "The lesson could not be prepared." : notice}</span></div>
          {hasBuildError && notice && <p className="loading-error-copy" role="alert">{notice}</p>}
          {hasBuildError && <div className="loading-actions"><button className="button button-primary" type="button" onClick={() => void saveBrief()} disabled={isBuilding || isUnsupportedBrief}>{isUnsupportedBrief ? "Choose a supported example" : "Retry research"}</button><button className="button button-secondary" type="button" onClick={() => setCurrentStep(1)}>Back to lesson brief</button></div>}
          {notice && !hasBuildError && <p className="step-notice" role="status">{notice}</p>}
        </section>}

        {currentStep === 3 && <>
          <div className="page-intro"><p className="eyebrow">LESSON DRAFT</p><h1>{isCurrentDraft ? lessonDraft?.brief.title : "Your saved lesson draft"}</h1><p className="intro-copy">Review the lesson flow, explanations, examples, activities, knowledge checks, and linked references.</p></div>
          {isCurrentDraft ? renderLesson("draft") : <div className="empty-state"><h2>Build the current brief to view its draft.</h2><button className="button button-primary" type="button" onClick={() => setCurrentStep(1)}>Return to lesson brief</button></div>}
          {isCurrentDraft && <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => setCurrentStep(1)}>Back to brief</button><button className="button button-primary" type="button" onClick={() => setCurrentStep(4)}>Continue to quality checks <span aria-hidden="true">→</span></button></div>}
        </>}

        {currentStep === 4 && <>
          <div className="page-intro"><p className="eyebrow">QUALITY CONTROL</p><h1>Review the lesson in two layers.</h1><p className="intro-copy">Run both reviews separately. Findings stay attached to this draft and suggested edits can open a section-specific prompt.</p></div>
          {isCurrentDraft ? renderLesson("quality") : <div className="empty-state"><h2>Build the current brief before reviewing it.</h2><button className="button button-primary" type="button" onClick={() => setCurrentStep(1)}>Return to lesson brief</button></div>}
          {isCurrentDraft && <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => setCurrentStep(3)}>Back to lesson draft</button><button className="button button-primary" type="button" onClick={() => setCurrentStep(5)} disabled={!qualityReviewsComplete} title={!qualityReviewsComplete ? "Complete both quality reviews before export" : undefined}>Continue to export <span aria-hidden="true">→</span></button></div>}
        </>}

        {currentStep === 5 && <>
          <div className="page-intro"><p className="eyebrow">FINAL REVIEW &amp; EXPORT</p><h1>Finalize the lesson package.</h1><p className="intro-copy">Preview the lesson and its completed audit reports. Download the lesson and the full QC record as separate Word documents.</p></div>
          {isCurrentDraft && qualityReviewsComplete ? renderLesson("export") : <div className="empty-state"><h2>Complete both QC layers to prepare the documents.</h2><button className="button button-primary" type="button" onClick={() => setCurrentStep(isCurrentDraft ? 4 : 1)}>{isCurrentDraft ? "Return to quality checks" : "Return to lesson brief"}</button></div>}
          {isCurrentDraft && <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => setCurrentStep(4)}>Back to quality checks</button></div>}
        </>}
      </main>
    </div>
  );
}
