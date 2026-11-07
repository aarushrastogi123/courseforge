"use client";

import { useState } from "react";
import { QualityReviewPanel } from "@/components/lesson/quality-review-panel";
import type { LessonDraft, QCFinding, QCReport } from "@/lib/lesson/types";

type Props = {
  lesson: LessonDraft;
  view: "draft" | "quality" | "export";
  isCurrent: boolean;
  onLessonUpdate: (lesson: LessonDraft) => void;
  onReturnToQuality: () => void;
  onDownloadsComplete: (files: Array<"lesson" | "reports">) => void;
  promptSectionId: string | null;
  initialPrompt: string;
  onPromptClosed: () => void;
  onOpenSectionPrompt: (sectionId: string, instruction?: string) => void;
};

function sourceKindLabel(kind: string) {
  if (kind === "youtube") return "VIDEO";
  if (kind === "book") return "BOOK";
  return "WEBSITE";
}

function pendingReports(reports: LessonDraft["qualityReports"]): LessonDraft["qualityReports"] {
  const reset = (report: QCReport): QCReport => ({ ...report, status: "pending", summary: "Lesson changes were applied. Rerun this check to review the revised content and catch any remaining issues.", findings: [], generatedAt: undefined });
  return { "factual-accuracy": reset(reports["factual-accuracy"]), "instructional-quality": reset(reports["instructional-quality"]) };
}

export function LessonDraftView({ lesson, view, isCurrent, onLessonUpdate, onReturnToQuality, onDownloadsComplete, promptSectionId, initialPrompt, onPromptClosed, onOpenSectionPrompt }: Props) {
  const [workingCopy, setWorkingCopy] = useState<LessonDraft | null>(null);
  const [openPromptId, setOpenPromptId] = useState<string | null>(promptSectionId);
  const [instruction, setInstruction] = useState(initialPrompt);
  const [generatedEdit, setGeneratedEdit] = useState<{ sectionId: string; content: string; model: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [exporting, setExporting] = useState<"lesson" | "reports" | null>(null);
  const [exportError, setExportError] = useState("");
  const [retryKind, setRetryKind] = useState<"lesson" | "reports">("lesson");
  const [downloadPrompt, setDownloadPrompt] = useState<{ downloaded: "lesson" | "reports"; other: "lesson" | "reports" } | null>(null);
  const isEditing = workingCopy !== null;
  const displayedLesson = workingCopy ?? lesson;
  const duration = lesson.sections.reduce((total, section) => total + section.durationMinutes, 0);

  function updateWorkingCopy(updater: (current: LessonDraft) => LessonDraft) {
    setWorkingCopy((current) => current ? updater(current) : current);
  }

  function saveEdits() {
    if (!workingCopy) return;
    onLessonUpdate({ ...workingCopy, qualityReports: pendingReports(workingCopy.qualityReports), updatedAt: new Date().toISOString() });
    setWorkingCopy(null);
    onReturnToQuality();
  }

  function closePrompt() {
    setOpenPromptId(null);
    setGeneratedEdit(null);
    setInstruction("");
    setGenerationError("");
    onPromptClosed();
  }

  async function generateSectionEdit(sectionId: string) {
    if (!instruction.trim()) { setGenerationError("Write an instruction for how the model should revise this section."); return; }
    setIsGenerating(true);
    setGenerationError("");
    setGeneratedEdit(null);
    try {
      const response = await fetch("/api/lessons/edit-section", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lesson, sectionId, instruction }) });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object" || !("replacementContent" in payload) || typeof payload.replacementContent !== "string") {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "The section edit could not be generated. Your lesson is unchanged; retry.";
        throw new Error(message);
      }
      setGeneratedEdit({ sectionId, content: payload.replacementContent, model: "model" in payload && typeof payload.model === "string" ? payload.model : "configured model" });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "The section edit could not be generated. Your lesson is unchanged; retry.");
    } finally { setIsGenerating(false); }
  }

  function applyGeneratedEdit() {
    if (!generatedEdit) return;
    const updated: LessonDraft = {
      ...lesson,
      sections: lesson.sections.map((section) => section.id === generatedEdit.sectionId ? { ...section, content: generatedEdit.content } : section),
      qualityReports: pendingReports(lesson.qualityReports),
      updatedAt: new Date().toISOString(),
    };
    onLessonUpdate(updated);
    closePrompt();
    onReturnToQuality();
  }

  function openFindingPrompt(finding: QCFinding) {
    const sectionId = finding.suggestedEdit?.sectionId ?? lesson.sections.find((section) => finding.location?.toLowerCase().includes(section.heading.toLowerCase()))?.id ?? lesson.sections[0]?.id;
    if (sectionId) onOpenSectionPrompt(sectionId, finding.recommendation);
  }

  async function downloadDocument(kind: "lesson" | "reports"): Promise<boolean> {
    setExporting(kind);
    setRetryKind(kind);
    setExportError("");
    try {
      const response = await fetch("/api/lessons/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lesson, kind }) });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "The Word document could not be prepared. Please retry.";
        throw new Error(message);
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const safeTitle = lesson.brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeTitle}-${kind === "lesson" ? "lesson" : "quality-reports"}.docx`;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError("");
      return true;
    } catch (error) { setExportError(error instanceof Error ? error.message : "The Word document could not be prepared. Please retry."); return false; }
    finally { setExporting(null); }
  }

  async function beginDownload(kind: "lesson" | "reports") {
    if (!await downloadDocument(kind)) return;
    setDownloadPrompt({ downloaded: kind, other: kind === "lesson" ? "reports" : "lesson" });
  }

  async function finishDownloadChoice(includeOther: boolean) {
    if (!downloadPrompt) return;
    const files: Array<"lesson" | "reports"> = [downloadPrompt.downloaded];
    if (includeOther) {
      if (!await downloadDocument(downloadPrompt.other)) { setDownloadPrompt(null); return; }
      files.push(downloadPrompt.other);
    }
    setDownloadPrompt(null);
    onDownloadsComplete(files);
  }

  if (view === "quality") {
    return <div className="workflow-page-card">
      <div className="qc-lesson-context"><span className="time-chip">{duration} min lesson</span><div><strong>{lesson.brief.title}</strong><p>{lesson.brief.learningObjective}</p></div></div>
      <QualityReviewPanel lesson={lesson} onApplySuggestion={openFindingPrompt} onReport={(report) => onLessonUpdate({ ...lesson, updatedAt: new Date().toISOString(), qualityReports: { ...lesson.qualityReports, [report.layer]: report } })} />
      <section className="section-edit-picker" aria-labelledby="section-edit-heading"><div><p className="eyebrow">INSTRUCTOR EDITING</p><h3 id="section-edit-heading">Prompt a change in one section.</h3><p>Choose the section to revise. The model will return a preview; the saved lesson changes only after you apply it.</p></div><div className="section-edit-list">{lesson.sections.map((section) => <button className="section-edit-option" key={section.id} type="button" onClick={() => onOpenSectionPrompt(section.id)}><span>{section.heading}</span><span>Prompt edit <span aria-hidden="true">→</span></span></button>)}</div></section>
    </div>;
  }

  const showLessonContent = view === "draft" || view === "export";
  return <section className={`lesson-output workflow-page-card ${view === "export" ? "is-final-preview" : ""}`} aria-labelledby="lesson-output-heading">
    <div className="lesson-output-heading"><div><p className="eyebrow">{view === "export" ? "FINAL DOCUMENT PREVIEW" : "LESSON DRAFT"}</p>
      {isEditing ? <div className="lesson-edit-brief"><h2 id="lesson-output-heading" className="visually-hidden">Edit lesson details</h2><label>Lesson title<input value={displayedLesson.brief.title} onChange={(event) => updateWorkingCopy((current) => ({ ...current, brief: { ...current.brief, title: event.target.value } }))} /></label><label>Learning objective<textarea value={displayedLesson.brief.learningObjective} onChange={(event) => updateWorkingCopy((current) => ({ ...current, brief: { ...current.brief, learningObjective: event.target.value } }))} /></label></div> : <><h2 id="lesson-output-heading">{lesson.brief.title}</h2><p className="lesson-objective">{lesson.brief.learningObjective}</p></>}
      </div><div className="lesson-actions"><span className="draft-status">{duration} min · {lesson.sections.length} sections</span>{view === "draft" && (isEditing ? <><button className="button button-primary" type="button" onClick={saveEdits}>Save changes</button><button className="button button-secondary" type="button" onClick={() => setWorkingCopy(null)}>Cancel</button></> : <button className="button button-secondary" type="button" onClick={() => setWorkingCopy(lesson)}>Edit lesson</button>)}</div>
    </div>

    {view === "draft" && <div className="research-note"><span className="research-note-mark" aria-hidden="true">R</span><p><strong>{lesson.generationMethod === "ai-assisted" ? "Research-backed AI draft" : "Curated sample draft"}</strong><span>{lesson.generationMethod === "ai-assisted" ? "Generated with " + (lesson.model || "the configured model") + " using live search results. Review the source excerpts and references; model output still needs instructor verification." : "This prewritten example has linked references; it is not generated from live research or an AI model. Its quality checks use heuristics."}</span></p></div>}

    {showLessonContent && <div className="lesson-sections">{displayedLesson.sections.map((section, index) => {
      const sectionSources = displayedLesson.sources.filter((source) => section.sourceIds.includes(source.id));
      const promptOpen = openPromptId === section.id && view === "draft";
      return <article className="lesson-section" key={section.id}><div className="lesson-section-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{section.durationMinutes} min</span></div><div className="lesson-section-body">
        {isEditing ? <div className="lesson-edit-fields"><label>Section heading<input value={section.heading} onChange={(event) => updateWorkingCopy((current) => ({ ...current, sections: current.sections.map((item) => item.id === section.id ? { ...item, heading: event.target.value } : item) }))} /></label><label>Teaching purpose<input value={section.purpose} onChange={(event) => updateWorkingCopy((current) => ({ ...current, sections: current.sections.map((item) => item.id === section.id ? { ...item, purpose: event.target.value } : item) }))} /></label><label>Lesson content<textarea rows={8} value={section.content} onChange={(event) => updateWorkingCopy((current) => ({ ...current, sections: current.sections.map((item) => item.id === section.id ? { ...item, content: event.target.value } : item) }))} /></label></div> : <><h3>{section.heading}</h3><p className="lesson-purpose">{section.purpose}</p><p className="lesson-section-content">{section.content}</p></>}
        <p className="lesson-source-label">Sources: {sectionSources.length ? sectionSources.map((source) => source.title).join(" · ") : "No sources linked to this section."}</p>
        {section.claims && section.claims.length > 0 && <div className="claim-evidence"><strong>Claim evidence links</strong><ul>{section.claims.map((claim) => {const claimSources = displayedLesson.sources.filter((source) => claim.sourceIds.includes(source.id)); return <li key={claim.id}><span>{claim.text}</span><span>{claimSources.length ? claimSources.map((source) => <a href={source.url} key={source.id} target="_blank" rel="noreferrer">{source.title}</a>) : "No linked evidence"}</span></li>;})}</ul></div>}
        {view === "draft" && !isEditing && <button className="section-prompt-trigger" type="button" onClick={() => { setOpenPromptId(promptOpen ? null : section.id); setGeneratedEdit(null); setGenerationError(""); if (!promptOpen) { setInstruction(""); onPromptClosed(); } }}>Ask AI to revise this section <span aria-hidden="true">→</span></button>}
        {promptOpen && <div className="section-prompt-card"><div className="section-prompt-heading"><div><strong>Section prompt</strong><p>Only this section is sent for revision, with its objective and linked source excerpts.</p></div><button className="icon-close" type="button" aria-label="Close section prompt" onClick={closePrompt}>×</button></div>
          {!generatedEdit ? <><label htmlFor={`prompt-${section.id}`}>How should the model improve “{section.heading}”?</label><textarea id={`prompt-${section.id}`} maxLength={1200} rows={3} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="For example: make the explanation more concise and add clearer transitions without introducing new facts."/><div className="prompt-footer"><span>{instruction.length}/1200 · Model: {lesson.model || "configured provider"}</span><button className="button button-primary" type="button" disabled={isGenerating || !instruction.trim()} onClick={() => void generateSectionEdit(section.id)}>{isGenerating ? "Generating preview…" : "Make changes with AI"}</button></div></> : <div className="generated-edit-preview"><p className="preview-label">MODEL PREVIEW · {generatedEdit.model}</p><p>{generatedEdit.content}</p><div className="prompt-footer"><button className="button button-secondary" type="button" onClick={() => setGeneratedEdit(null)}>Try another prompt</button><button className="button button-primary" type="button" onClick={applyGeneratedEdit}>Apply changes and rerun quality checks</button></div></div>}
          {generationError && <p className="field-error" role="alert">{generationError}</p>}
        </div>}
      </div></article>;
    })}</div>}

    {showLessonContent && <div className="source-library"><div className="source-library-heading"><div><p className="eyebrow">REFERENCE LIBRARY</p><h3>Sources used for this outline</h3></div><span>{lesson.sources.length} references</span></div><ul className="source-list">{displayedLesson.sources.map((source) => <li className="source-item" key={source.id}><span className="source-kind">{sourceKindLabel(source.kind)}</span><span className="source-copy"><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><small>{source.publisher} · {source.relevanceNote}{source.accessedAt ? " Retrieved " + new Date(source.accessedAt).toLocaleDateString() + "." : ""}</small>{source.evidenceExcerpt && <details className="source-excerpt"><summary>{source.kind === "youtube" ? "Video description" : "Retrieved excerpt"}</summary><p>{source.evidenceExcerpt}</p></details>}</span><span className="source-arrow" aria-hidden="true">↗</span></li>)}</ul></div>}

    {view === "export" && <section className="final-audit-preview" aria-labelledby="final-audit-heading"><div><p className="eyebrow">FINAL QUALITY RECORD</p><h3 id="final-audit-heading">Two completed audit reports</h3></div><div className="final-audit-grid">{(["factual-accuracy", "instructional-quality"] as const).map((layer) => {const report = lesson.qualityReports[layer]; return <article key={layer}><span className="quality-status is-complete">{report.reviewMethod === "ai-assisted" ? "Model-assisted" : "Heuristic review"}</span><h4>{layer === "factual-accuracy" ? "Research & factual accuracy" : "Instructional quality"}</h4><p>{report.summary}</p><span>{report.findings.length} finding{report.findings.length === 1 ? "" : "s"} · {report.status === "complete" ? "Complete" : "Pending"}</span></article>;})}</div>
      <div className="document-downloads"><div><p className="eyebrow">WORD DOCUMENTS</p><h3>Export the finalized package.</h3><p>Each file uses the CourseForge instructor template and includes the lesson context.</p></div><div className="document-download-grid"><article><span className="document-mark" aria-hidden="true">DOC</span><div><strong>Final lesson</strong><p>Lesson flow, timing, activities, knowledge checks, and full references.</p></div><button className="button button-primary" type="button" disabled={Boolean(exporting) || !isCurrent} onClick={() => void beginDownload("lesson")}>{exporting === "lesson" ? "Preparing…" : "Download lesson.docx"}</button></article><article><span className="document-mark report-mark" aria-hidden="true">QC</span><div><strong>Quality reports</strong><p>Both complete audit reports, findings, recommendations, and reference register.</p></div><button className="button button-secondary" type="button" disabled={Boolean(exporting) || !isCurrent} onClick={() => void beginDownload("reports")}>{exporting === "reports" ? "Preparing…" : "Download reports.docx"}</button></article></div>
      {exportError && <div className="quality-error" role="alert"><p>{exportError}</p><button className="button button-secondary" type="button" disabled={Boolean(exporting)} onClick={() => void beginDownload(retryKind)}>Retry {retryKind === "lesson" ? "lesson" : "quality reports"} download</button></div>}
    </div></section>}
    {view === "export" && downloadPrompt && <div className="download-confirm-backdrop"><section className="download-confirm" role="dialog" aria-modal="true" aria-labelledby="download-confirm-heading" aria-describedby="download-confirm-copy" onKeyDown={(event) => { if (event.key === "Escape" && !exporting) void finishDownloadChoice(false); }}><p className="eyebrow">DOWNLOAD READY</p><h2 id="download-confirm-heading">Would you like the other file too?</h2><p id="download-confirm-copy">Your {downloadPrompt.downloaded === "lesson" ? "lesson" : "quality reports"} document has been downloaded. Download the {downloadPrompt.other === "lesson" ? "lesson" : "quality reports"} document as well?</p><div className="download-confirm-actions"><button className="button button-secondary" type="button" disabled={Boolean(exporting)} onClick={() => void finishDownloadChoice(false)}>No thanks</button><button className="button button-primary" type="button" autoFocus disabled={Boolean(exporting)} onClick={() => void finishDownloadChoice(true)}>{exporting ? "Preparing…" : `Download ${downloadPrompt.other === "lesson" ? "lesson" : "reports"} too`}</button></div></section></div>}
  </section>;
}
