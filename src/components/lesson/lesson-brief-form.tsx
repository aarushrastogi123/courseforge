"use client";

import type { FormEvent } from "react";
import { GIT_SAMPLE_LESSON_BRIEF, SAMPLE_LESSON_BRIEF, type LessonBriefErrors } from "@/lib/lesson/brief";
import type { LessonBrief } from "@/lib/lesson/types";

type LessonBriefFormProps = {
  brief: LessonBrief;
  errors: LessonBriefErrors;
  notice: string;
  isBuilding: boolean;
  hasBuildError: boolean;
  unsupportedBrief: boolean;
  researchReadiness: { ready: boolean; missing: string[]; aiProvider: "gemini" | "openai" | null } | null;
  onChange: (field: keyof LessonBrief, value: string) => void;
  onUseSample: (sample: LessonBrief) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LessonBriefForm({
  brief,
  errors,
  notice,
  isBuilding,
  hasBuildError,
  unsupportedBrief,
  researchReadiness,
  onChange,
  onUseSample,
  onSubmit,
}: LessonBriefFormProps) {
  return (
    <section className="brief-panel" id="brief-panel" aria-labelledby="brief-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">STEP 01 <span>·</span> THE BRIEF</p>
          <h2 id="brief-heading">What should learners understand?</h2>
        </div>
        <span className="time-chip">45 min total</span>
      </div>

      <form className="brief-form" onSubmit={onSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="lesson-title">Lesson title</label>
          <p className="field-hint" id="title-hint">
            Keep it focused on one topic.
          </p>
          <input
            id="lesson-title"
            name="lesson-title"
            value={brief.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="For example, HTTP Requests and Responses"
            aria-describedby={errors.title ? "title-hint title-error" : "title-hint"}
            aria-invalid={Boolean(errors.title)}
            autoComplete="off"
          />
          {errors.title && (
            <p className="field-error" id="title-error">
              {errors.title}
            </p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="learning-objective">Learning objective</label>
          <p className="field-hint" id="objective-hint">
            Describe what learners will be able to explain or do.
          </p>
          <textarea
            id="learning-objective"
            name="learning-objective"
            value={brief.learningObjective}
            onChange={(event) => onChange("learningObjective", event.target.value)}
            placeholder="By the end of this lesson, learners will be able to…"
            rows={4}
            aria-describedby={
              errors.learningObjective
                ? "objective-hint objective-error"
                : "objective-hint"
            }
            aria-invalid={Boolean(errors.learningObjective)}
          />
          {errors.learningObjective && (
            <p className="field-error" id="objective-error">
              {errors.learningObjective}
            </p>
          )}
        </div>

        <div className="form-actions">
          <button
            className="button button-primary"
            type="submit"
            disabled={isBuilding || unsupportedBrief}
          >
            {isBuilding
              ? "Building draft…"
              : unsupportedBrief
                ? "Choose a supported sample"
                : hasBuildError
                ? "Retry lesson draft"
                : "Build lesson draft"}
            {!isBuilding && <span aria-hidden="true">→</span>}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onUseSample(SAMPLE_LESSON_BRIEF)}
            disabled={isBuilding}
          >
            Use the HTTP example
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onUseSample(GIT_SAMPLE_LESSON_BRIEF)}
            disabled={isBuilding}
          >
            Use the Git example
          </button>
        </div>

        <p className="save-note" role="status" aria-live="polite">
          {isBuilding
            ? "Researching sources and preparing a 45-minute lesson…"
            : notice || (unsupportedBrief
              ? "This version supports the HTTP and Git examples only."
              : researchReadiness?.ready
                ? "Custom topics will use live web, book, and YouTube research."
                : researchReadiness
                  ? "Custom topics need server setup: " + researchReadiness.missing.join(", ") + "."
                  : "Checking research provider setup…")}
        </p>
      </form>
    </section>
  );
}
