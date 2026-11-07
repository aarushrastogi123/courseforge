"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { LessonBriefForm } from "@/components/lesson/lesson-brief-form";
import { LessonDraftView } from "@/components/lesson/lesson-draft-view";
import {
  GIT_SAMPLE_LESSON_BRIEF,
  SAMPLE_LESSON_BRIEF,
  validateLessonBrief,
  type LessonBriefErrors,
} from "@/lib/lesson/brief";
import type { LessonBrief, LessonDraft } from "@/lib/lesson/types";

const BRIEF_STORAGE_KEY = "kalvium-lesson-studio.brief.v1";
const LESSON_STORAGE_KEY = "kalvium-lesson-studio.lesson.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLessonDraft(value: unknown): value is LessonDraft {
  if (!isRecord(value) || !isRecord(value.brief)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.brief.title === "string" &&
    typeof value.brief.learningObjective === "string" &&
    isRecord(value.qualityReports) &&
    isRecord(value.qualityReports["factual-accuracy"]) &&
    isRecord(value.qualityReports["instructional-quality"]) &&
    Array.isArray(value.sections) &&
    Array.isArray(value.sources)
  );
}

export default function Home() {
  const [brief, setBrief] = useState<LessonBrief>({ title: "", learningObjective: "" });
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [errors, setErrors] = useState<LessonBriefErrors>({});
  const [notice, setNotice] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasBuildError, setHasBuildError] = useState(false);
  const [isUnsupportedBrief, setIsUnsupportedBrief] = useState(false);
  const [activeNavTarget, setActiveNavTarget] = useState("brief-panel");
  const manualNavigationUntil = useRef(0);
  const [researchReadiness, setResearchReadiness] = useState<{ ready: boolean; missing: string[]; aiProvider: "gemini" | "openai" | null } | null>(null);

  useEffect(() => {
    try {
      const savedBrief = window.localStorage.getItem(BRIEF_STORAGE_KEY);
      if (savedBrief) {
        const parsed = JSON.parse(savedBrief) as Partial<LessonBrief>;
        if (
          typeof parsed.title === "string" &&
          typeof parsed.learningObjective === "string"
        ) {
          const restoredBrief = { title: parsed.title, learningObjective: parsed.learningObjective };
          startTransition(() => {
            setBrief(restoredBrief);
            setNotice("Your saved lesson brief is ready to continue.");
          });
        }
      }

      const savedLesson = window.localStorage.getItem(LESSON_STORAGE_KEY);
      if (savedLesson) {
        const parsed: unknown = JSON.parse(savedLesson);
        if (isLessonDraft(parsed)) startTransition(() => setLessonDraft(parsed));
      }
    } catch {
      startTransition(() => setNotice("A saved item could not be read. Your current entries are still available."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lessons", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { liveResearch?: { ready?: boolean; missing?: string[]; aiProvider?: "gemini" | "openai" | null } }) => {
        if (!cancelled && payload.liveResearch) {
          setResearchReadiness({ ready: Boolean(payload.liveResearch.ready), missing: payload.liveResearch.missing ?? [], aiProvider: payload.liveResearch.aiProvider ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) setResearchReadiness({ ready: false, missing: ["research providers unavailable"], aiProvider: null });
      });
    return () => { cancelled = true; };
  }, []);

  const isCurrentDraft = Boolean(
    lessonDraft &&
      lessonDraft.brief.title.trim() === brief.title.trim() &&
      lessonDraft.brief.learningObjective.trim() === brief.learningObjective.trim(),
  );
  const qualityReviewsComplete = Boolean(
    isCurrentDraft && lessonDraft?.qualityReports["factual-accuracy"].status === "complete" &&
    lessonDraft?.qualityReports["instructional-quality"].status === "complete",
  );

  useEffect(() => {
    const targets = ["brief-panel", "lesson-output", "quality-panel"];
    const targetToStep: Record<string, string> = {
      "brief-panel": "brief-panel",
      "lesson-output": "lesson-output",
      "review-export": "review-export",
      "quality-panel": "quality-panel",
    };

    function syncHash() {
      const hashTarget = window.location.hash.slice(1);
      if (targetToStep[hashTarget]) setActiveNavTarget(hashTarget);
    }

    function syncScroll() {
      if (Date.now() < manualNavigationUntil.current) return;
      const current = targets
        .map((id) => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top ?? Infinity }))
        .filter((target) => target.top <= window.innerHeight * 0.35)
        .sort((a, b) => b.top - a.top)[0];
      if (current) setActiveNavTarget(current.id);
    }

    syncHash();
    if (!window.location.hash) {
      startTransition(() => setActiveNavTarget(qualityReviewsComplete ? "review-export" : isCurrentDraft ? "quality-panel" : "brief-panel"));
    }
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("scroll", syncScroll, { passive: true });
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("scroll", syncScroll);
    };
  }, [isCurrentDraft, qualityReviewsComplete]);

  function updateBrief(field: keyof LessonBrief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setIsUnsupportedBrief(false);
    setHasBuildError(false);
    setNotice("");
  }

  function useSampleBrief(sample: LessonBrief = SAMPLE_LESSON_BRIEF) {
    setBrief(sample);
    setErrors({});
    setHasBuildError(false);
    setIsUnsupportedBrief(false);
    setNotice(sample === GIT_SAMPLE_LESSON_BRIEF ? "Git example loaded. Build the draft when ready." : "HTTP example loaded. Build the draft when ready.");
  }

  async function saveBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLessonBrief(brief);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setNotice("Complete both fields before building a lesson draft.");
      return;
    }

    const cleanBrief = {
      title: brief.title.trim(),
      learningObjective: brief.learningObjective.trim(),
    };
    setBrief(cleanBrief);
    setHasBuildError(false);
    setIsUnsupportedBrief(false);

    let briefSavedLocally = true;
    let canRetry = true;
    try {
      window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(cleanBrief));
    } catch {
      briefSavedLocally = false;
    }

    setIsBuilding(true);
    setNotice("Brief saved. Preparing the curated lesson draft…");

    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanBrief),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 422) {
          canRetry = false;
          setIsUnsupportedBrief(true);
        }
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "The lesson draft could not be prepared. Your brief is saved; you can retry.";
        throw new Error(message);
      }

      if (!isRecord(payload) || !isLessonDraft(payload.lesson)) {
        throw new Error("The lesson service returned an unreadable draft. Please retry.");
      }

      const lesson = payload.lesson;
      setLessonDraft(lesson);
      try {
        window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(lesson));
      } catch {
        setNotice("Outline ready, but browser storage is unavailable. Keep this tab open to retain it.");
        return;
      }

      setNotice(
        briefSavedLocally
          ? "Curated lesson draft saved in this browser."
          : "Draft ready. Browser storage is unavailable, so it will not persist after this tab closes.",
      );
    } catch (error) {
      setHasBuildError(canRetry);
      setNotice(
        error instanceof Error
          ? `${error.message} ${briefSavedLocally ? "Your brief is saved; retry when ready." : "Your brief is still in this tab; browser storage is unavailable."}`
          : "The lesson draft could not be prepared. Your brief is saved; you can retry.",
      );
    } finally {
      setIsBuilding(false);
    }
  }

  function updateLesson(updated: LessonDraft) {
    setLessonDraft(updated);
    setBrief(updated.brief);
    try {
      window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(updated));
      window.localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(updated.brief));
      setNotice("Lesson changes and review results are saved on this device.");
    } catch {
      setNotice("The lesson is updated, but browser storage is unavailable. Keep this tab open to retain it.");
    }
  }

  return (
    <div className="studio-shell">
      <a className="skip-link" href="#main-content">
        Skip to lesson brief
      </a>

      <header className="topbar">
        <Link className="brand" href="/" aria-label="CourseForge home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span className="brand-copy">
            <strong>CourseForge</strong>
            <span>LESSON STUDIO</span>
          </span>
        </Link>
        <div className="workspace-status">
          <span className="status-dot" aria-hidden="true" />
          Local workspace
        </div>
      </header>

      <nav className="workflow" aria-label="Lesson creation steps">
        <ol className="workflow-list">
          <li className={`workflow-step ${!isCurrentDraft ? "is-current" : "is-complete"} ${activeNavTarget === "brief-panel" ? "is-active" : ""}`} aria-current={!isCurrentDraft ? "step" : undefined}>
            <a href="#brief-panel" onClick={() => { manualNavigationUntil.current = Date.now() + 800; setActiveNavTarget("brief-panel"); }}><span className="step-number">01</span><span>Brief</span></a>
          </li>
          <li className={`workflow-step ${isCurrentDraft ? "is-complete" : "is-disabled"} ${activeNavTarget === "lesson-output" ? "is-active" : ""}`}>
            {isCurrentDraft ? <a href="#lesson-output" onClick={() => { manualNavigationUntil.current = Date.now() + 800; setActiveNavTarget("lesson-output"); }}><span className="step-number">02</span><span>Lesson draft</span></a> : <span className="workflow-disabled" aria-disabled="true" title="Build a lesson first"><span className="step-number">02</span><span>Lesson draft</span></span>}
          </li>
          <li className={`workflow-step ${qualityReviewsComplete ? "is-complete" : isCurrentDraft ? "is-current" : "is-disabled"} ${activeNavTarget === "quality-panel" ? "is-active" : ""}`} aria-current={isCurrentDraft && !qualityReviewsComplete ? "step" : undefined}>
            {isCurrentDraft ? <a href="#quality-panel" onClick={() => { manualNavigationUntil.current = Date.now() + 800; setActiveNavTarget("quality-panel"); }}><span className="step-number">03</span><span>Quality checks</span></a> : <span className="workflow-disabled" aria-disabled="true" title="Build a lesson first"><span className="step-number">03</span><span>Quality checks</span></span>}
          </li>
          <li className={`workflow-step ${qualityReviewsComplete ? "is-current" : isCurrentDraft ? "is-available" : "is-disabled"} ${activeNavTarget === "review-export" ? "is-active" : ""}`} aria-current={qualityReviewsComplete ? "step" : undefined}>
            {isCurrentDraft ? <a href="#review-export" onClick={() => { manualNavigationUntil.current = Date.now() + 800; setActiveNavTarget("review-export"); }}><span className="step-number">04</span><span>Review &amp; export</span></a> : <span className="workflow-disabled" aria-disabled="true" title="Build a lesson first"><span className="step-number">04</span><span>Review &amp; export</span></span>}
          </li>
        </ol>
      </nav>

      <main className="content-wrap" id="main-content" tabIndex={-1}>
        <div className="page-intro">
          <p className="eyebrow">LESSON WORKSPACE</p>
          <h1>{isCurrentDraft ? "Your lesson draft is ready." : "Build a lesson draft."}</h1>
          <p className="intro-copy">
            Choose a supported sample, review its references and quality checks, then edit and export the lesson.
          </p>
        </div>

        <div className="workspace-grid">
          <LessonBriefForm
            brief={brief}
            errors={errors}
            notice={notice}
            isBuilding={isBuilding}
            hasBuildError={hasBuildError}
            unsupportedBrief={isUnsupportedBrief}
            researchReadiness={researchReadiness}
            onChange={updateBrief}
            onUseSample={useSampleBrief}
            onSubmit={saveBrief}
          />

          <aside className="guide-panel" aria-labelledby="guide-heading">
            <p className="eyebrow">CURRENT SCOPE</p>
            <h2 id="guide-heading">Two curated examples are ready.</h2>
            <p className="guide-copy">{researchReadiness?.ready ? "Live research is configured; " + (researchReadiness.aiProvider === "gemini" ? "Gemini" : "OpenAI") + " is the active generation and model-assisted QC provider." : "Live topic generation needs provider keys in the server environment."}</p>
            <ul className="guide-list">
              <li><span className="guide-index">A</span><span><strong>45-minute examples</strong><small>HTTP Requests and Responses; Git Branching and Merging.</small></span></li>
              <li><span className="guide-index">B</span><span><strong>Books, websites, and videos</strong><small>Sample references are curated; configured live topics search all three types.</small></span></li>
              <li><span className="guide-index">C</span><span><strong>Two separate checks</strong><small>Current checks use heuristics and do not verify source contents.</small></span></li>
            </ul>
            <div className="guide-footer"><span className="guide-line" aria-hidden="true" /><p>Drafts are saved in this browser on this device.</p></div>
          </aside>
        </div>

        {lessonDraft && <LessonDraftView lesson={lessonDraft} isCurrent={isCurrentDraft} onLessonUpdate={updateLesson} />}
      </main>

    </div>
  );
}
