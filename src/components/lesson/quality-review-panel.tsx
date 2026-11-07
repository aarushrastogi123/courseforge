"use client";

import { useState } from "react";
import type { LessonDraft, QCFinding, QCLayer, QCReport } from "@/lib/lesson/types";

type Props = {
  lesson: LessonDraft;
  onReport: (report: QCReport) => void;
  onApplySuggestion: (finding: QCFinding) => void;
  disabled?: boolean;
};

const layers: { id: QCLayer; title: string; short: string; heuristic: string; modelAssisted: string }[] = [
  { id: "factual-accuracy", title: "Research & factual accuracy · Layer 1", short: "01", heuristic: "Checks citation links and reference metadata; it cannot inspect facts in source content.", modelAssisted: "Compares claims with retrieved excerpts and flags gaps or contradictions. It is not proof of accuracy." },
  { id: "instructional-quality", title: "Instructional quality · Layer 2", short: "02", heuristic: "Checks objective wording, timing, examples, practice, and knowledge-check structure.", modelAssisted: "Reviews objective alignment, clarity, sequencing, application, knowledge checks, and pacing." },
];

export function QualityReviewPanel({ lesson, onReport, onApplySuggestion, disabled = false }: Props) {
  const [running, setRunning] = useState<QCLayer | null>(null);
  const [error, setError] = useState("");
  const [failedLayer, setFailedLayer] = useState<QCLayer | null>(null);

  async function runReview(layer: QCLayer, useHeuristics = false) {
    setRunning(layer);
    setError("");
    setFailedLayer(null);
    try {
      const response = await fetch("/api/lessons/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson, layer, useHeuristics }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object" || !("report" in payload)) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "This review could not be completed. Please try again.";
        throw new Error(message);
      }
      onReport((payload as { report: QCReport }).report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This review could not be completed. Please try again.");
      setFailedLayer(layer);
    } finally {
      setRunning(null);
    }
  }

  return (
    <section className="quality-panel" id="quality-panel" aria-labelledby="quality-heading">
      <div className="quality-heading">
        <div>
          <p className="eyebrow">QUALITY CONTROL</p>
          <h3 id="quality-heading">Two separate audit reports</h3>
          <p>Run each layer separately. Reports save with this draft.</p>
        </div>
        <span className="quality-review-count">2 separate reviews</span>
      </div>

      <div className="quality-grid">
        {layers.map((item) => {
          const report = lesson.qualityReports[item.id];
          const isRunning = running === item.id;
          return (
            <article className="quality-card" key={item.id} aria-labelledby={`review-${item.id}`}>
              <div className="quality-card-top">
                <span className="quality-number">{item.short}</span>
                <span className={`quality-status ${report.status === "complete" ? "is-complete" : ""}`}>
                  {report.status === "complete" ? report.reviewMethod === "ai-assisted" ? "Model-assisted review" : "Heuristic review" : "Not run yet"}
                </span>
              </div>
              <h4 id={`review-${item.id}`}>{item.title}</h4>
              <p className="quality-detail">{report.reviewMethod === "ai-assisted" ? item.modelAssisted : item.heuristic}</p>
              <button className="button button-secondary quality-run-button" type="button" disabled={running !== null || disabled} onClick={() => runReview(item.id)}>
                {isRunning ? "Checking…" : report.status === "complete" ? `Rerun layer ${item.short}` : `Run layer ${item.short}`}
              </button>
              {report.status === "complete" && (
                <div className="quality-results" aria-live="polite">
                  <p className="quality-summary">{report.summary}</p>
                  <p className="quality-time">{report.reviewMethod === "ai-assisted" ? "Model-assisted" + (report.model ? " · " + report.model : "") : "Heuristic checks"}</p>
                  <ul>
                    {report.findings.map((finding) => <Finding key={finding.id} finding={finding} layer={item.id} lesson={lesson} onApplySuggestion={onApplySuggestion} />)}
                  </ul>
                  {report.generatedAt && <p className="quality-time">Completed {new Date(report.generatedAt).toLocaleString()}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {error && (
        <div className="quality-error" role="alert">
          <p>{error} Your lesson draft is unchanged.</p>
          {failedLayer && <button className="button button-secondary" type="button" disabled={running !== null || disabled} onClick={() => runReview(failedLayer, true)}>Run transparent heuristic checks instead</button>}
        </div>
      )}
      <p className="quality-caveat">Model-assisted reports compare only the research excerpts available to them and are not proof of accuracy. Heuristic reports check structure and metadata only. Review any proposed edit in its section prompt, apply it yourself, then rerun both layers.</p>
    </section>
  );
}

function Finding({ finding, layer, lesson, onApplySuggestion }: { finding: QCFinding; layer: QCLayer; lesson: LessonDraft; onApplySuggestion: (finding: QCFinding) => void }) {
  const suggestedSection = finding.suggestedEdit
    ? lesson.sections.find((section) => section.id === finding.suggestedEdit?.sectionId)
    : undefined;
  return (
    <li className="finding-item">
      <div className="finding-topline">
        <strong>{finding.issue}</strong>
        <span className={`finding-severity severity-${finding.severity}`}>{finding.severity}</span>
      </div>
      {finding.location && <span className="finding-location">{finding.location}</span>}
      <p>{finding.explanation}</p>
      <div className="finding-recommendation"><strong>Suggested next step</strong><span>{finding.recommendation}</span></div>
      {finding.suggestedEdit && suggestedSection ? (
        <details className="finding-suggested-edit">
          <summary>Review proposed wording for “{suggestedSection.heading}”</summary>
          <div className="suggestion-comparison">
            <div><strong>Current lesson wording</strong><p>{suggestedSection.content}</p></div>
            <div><strong>Proposed wording</strong><p>{finding.suggestedEdit.replacementContent}</p></div>
          </div>
          <button className="button button-secondary" type="button" onClick={() => onApplySuggestion(finding)}>
            Use recommendation as a section prompt
          </button>
        </details>
      ) : (
        <button className="button button-secondary" type="button" onClick={() => onApplySuggestion(finding)}>
          Open a section prompt
        </button>
      )}
      {layer === "factual-accuracy" && finding.sourceIds.length > 0 && (
        <span className="finding-sources">Linked references: {finding.sourceIds.length}</span>
      )}
    </li>
  );
}
