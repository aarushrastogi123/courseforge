"use client";

import { useState } from "react";
import type { LessonDraft, QCFinding, QCReport } from "@/lib/lesson/types";
import { QualityReviewPanel } from "@/components/lesson/quality-review-panel";

type LessonDraftViewProps = {
  lesson: LessonDraft;
  isCurrent: boolean;
  onLessonUpdate: (lesson: LessonDraft) => void;
};

function sourceKindLabel(kind: string) {
  if (kind === "youtube") return "VIDEO";
  if (kind === "book") return "BOOK";
  return "WEBSITE";
}

export function LessonDraftView({ lesson, isCurrent, onLessonUpdate }: LessonDraftViewProps) {
  const [workingCopy, setWorkingCopy] = useState<LessonDraft | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const isEditing = workingCopy !== null;
  const displayedLesson = workingCopy ?? lesson;
  const qualityComplete =
    lesson.qualityReports["factual-accuracy"].status === "complete" &&
    lesson.qualityReports["instructional-quality"].status === "complete";
  const canExport = isCurrent && qualityComplete && !isEditing && !isExporting;
  const duration = lesson.sections.reduce(
    (total, section) => total + section.durationMinutes,
    0,
  );

  function updateWorkingCopy(updater: (current: LessonDraft) => LessonDraft) {
    setWorkingCopy((current) => current ? updater(current) : current);
  }

  function saveEdits() {
    if (!workingCopy) return;
    const resetReport = (report: QCReport): QCReport => ({
      ...report,
      status: "pending",
      summary: "Lesson updated. Run this review again.",
      findings: [],
      generatedAt: undefined,
    });
    const resetReports: LessonDraft["qualityReports"] = {
      "factual-accuracy": resetReport(workingCopy.qualityReports["factual-accuracy"]),
      "instructional-quality": resetReport(workingCopy.qualityReports["instructional-quality"]),
    };
    onLessonUpdate({
      ...workingCopy,
      qualityReports: resetReports,
      updatedAt: new Date().toISOString(),
    });
    setWorkingCopy(null);
  }

  function loadSuggestedEdit(finding: QCFinding) {
    if (!finding.suggestedEdit) return;
    const base = workingCopy ?? lesson;
    const updated: LessonDraft = {
      ...base,
      sections: base.sections.map((section) =>
        section.id === finding.suggestedEdit?.sectionId
          ? { ...section, content: finding.suggestedEdit.replacementContent }
          : section,
      ),
    };
    setWorkingCopy(updated);
    window.requestAnimationFrame(() => {
      document.getElementById("lesson-output-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function exportLesson() {
    setIsExporting(true);
    setExportError("");
    try {
      const response = await fetch("/api/lessons/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "The Markdown file could not be prepared. Please retry.";
        throw new Error(message);
      }
      const file = await response.blob();
      const downloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      const safeTitle = lesson.brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
      link.href = downloadUrl;
      link.download = `${safeTitle}.md`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : "The Markdown file could not be prepared. Please retry.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="lesson-output" id="lesson-output" aria-labelledby="lesson-output-heading">
      <div className="lesson-output-heading">
        <div>
          <p className="eyebrow">LESSON DRAFT</p>
          {isEditing ? (
            <div className="lesson-edit-brief">
              <h2 id="lesson-output-heading" className="visually-hidden">Edit lesson details</h2>
                <label>Lesson title<input value={displayedLesson.brief.title} onChange={(event) => updateWorkingCopy((current) => ({ ...current, brief: { ...current.brief, title: event.target.value } }))} /></label>
                <label>Learning objective<textarea value={displayedLesson.brief.learningObjective} onChange={(event) => updateWorkingCopy((current) => ({ ...current, brief: { ...current.brief, learningObjective: event.target.value } }))} /></label>
            </div>
          ) : (
            <>
              <h2 id="lesson-output-heading">{lesson.brief.title}</h2>
              <p className="lesson-objective">{lesson.brief.learningObjective}</p>
            </>
          )}
        </div>
        <div className="lesson-actions" id="review-export" aria-label="Review and export controls">
          <span className="draft-status">{duration} min outline</span>
          {isEditing ? (
            <>
              <button className="button button-primary" type="button" onClick={saveEdits}>Save changes</button>
              <button className="button button-secondary" type="button" onClick={() => setWorkingCopy(null)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="button button-secondary" type="button" onClick={() => setWorkingCopy(lesson)}>Edit lesson</button>
              <button className="button button-primary" type="button" onClick={exportLesson} disabled={!canExport} aria-describedby="export-requirement">{isExporting ? "Preparing file…" : "Download Markdown"}</button>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
        <p className="export-requirement" id="export-requirement">
          {!isCurrent
            ? "Build the current brief before exporting this lesson."
            : qualityComplete
              ? "Both checks are included in the Markdown package."
              : "Run both quality checks before downloading the finalized lesson package."}
        </p>
      )}

      {exportError && <p className="quality-error" role="alert">{exportError}</p>}

      {!isCurrent && (
        <p className="stale-draft-note" role="status">
          This outline is for an earlier version of your brief. Save again to refresh it.
        </p>
      )}

      <div className="research-note">
        <span className="research-note-mark" aria-hidden="true">R</span>
        <p>
          <strong>{lesson.generationMethod === "ai-assisted" ? "Research-backed AI draft" : "Curated sample draft"}</strong>
          <span>
            {lesson.generationMethod === "ai-assisted"
              ? "Generated with " + (lesson.model || "the configured model") + " using live search results. Review the source excerpts and references; model output still needs instructor verification."
              : "This prewritten example has linked references; it is not generated from live research or an AI model. Its quality checks use heuristics."}
          </span>
        </p>
      </div>

      <div className="lesson-sections">
        {displayedLesson.sections.map((section, index) => {
          const sectionSources = displayedLesson.sources.filter((source) =>
            section.sourceIds.includes(source.id),
          );

          return (
            <article className="lesson-section" key={section.id}>
              <div className="lesson-section-meta">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{section.durationMinutes} min</span>
              </div>
              <div className="lesson-section-body">
                {isEditing ? (
                  <div className="lesson-edit-fields">
                    <label>Section heading<input value={section.heading} onChange={(event) => updateWorkingCopy((current) => ({ ...current, sections: current.sections.map((item) => item.id === section.id ? { ...item, heading: event.target.value } : item) }))} /></label>
                    <label>Teaching purpose<input value={section.purpose} onChange={(event) => updateWorkingCopy((current) => ({ ...current, sections: current.sections.map((item) => item.id === section.id ? { ...item, purpose: event.target.value } : item) }))} /></label>
                    <label>Lesson content<textarea rows={8} value={section.content} onChange={(event) => updateWorkingCopy((current) => ({ ...current, sections: current.sections.map((item) => item.id === section.id ? { ...item, content: event.target.value } : item) }))} /></label>
                  </div>
                ) : (
                  <>
                    <h3>{section.heading}</h3>
                    <p className="lesson-purpose">{section.purpose}</p>
                    <p className="lesson-section-content">{section.content}</p>
                  </>
                )}
                <p className="lesson-source-label">
                  Sources: {sectionSources.map((source) => source.title).join(" · ")}
                </p>
                {section.claims && section.claims.length > 0 && (
                  <div className="claim-evidence">
                    <strong>Claim evidence links</strong>
                    <ul>
                      {section.claims.map((claim) => {
                        const claimSources = displayedLesson.sources.filter((source) => claim.sourceIds.includes(source.id));
                        return (
                          <li key={claim.id}>
                            <span>{claim.text}</span>
                            <span>{claimSources.length ? claimSources.map((source) => <a href={source.url} key={source.id} target="_blank" rel="noreferrer">{source.title}</a>) : "No linked evidence"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="source-library">
        <div className="source-library-heading">
          <div>
            <p className="eyebrow">REFERENCE LIBRARY</p>
            <h3>Sources used for this outline</h3>
          </div>
          <span>{lesson.sources.length} references</span>
        </div>
        <ul className="source-list">
          {displayedLesson.sources.map((source) => (
            <li className="source-item" key={source.id}>
              <span className="source-kind">{sourceKindLabel(source.kind)}</span>
              <span className="source-copy">
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <small>{source.publisher} · {source.relevanceNote}{source.accessedAt ? " Retrieved " + new Date(source.accessedAt).toLocaleDateString() + "." : ""}</small>
                {source.evidenceExcerpt && (
                  <details className="source-excerpt">
                    <summary>{source.kind === "youtube" ? "Video description" : "Retrieved excerpt"}</summary>
                    <p>{source.evidenceExcerpt}</p>
                  </details>
                )}
              </span>
              <span className="source-arrow" aria-hidden="true">↗</span>
            </li>
          ))}
        </ul>
      </div>

      <QualityReviewPanel
        lesson={displayedLesson}
        disabled={isEditing}
        onApplySuggestion={loadSuggestedEdit}
        onReport={(report) => onLessonUpdate({
          ...lesson,
          updatedAt: new Date().toISOString(),
          qualityReports: { ...lesson.qualityReports, [report.layer]: report },
        })}
      />
    </section>
  );
}
