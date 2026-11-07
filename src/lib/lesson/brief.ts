import type { LessonBrief } from "@/lib/lesson/types";

export const SAMPLE_LESSON_BRIEF: LessonBrief = {
  title: "HTTP Requests and Responses",
  learningObjective:
    "Explain GET and POST methods and distinguish between 2xx, 4xx, and 5xx response status categories.",
};

export const GIT_SAMPLE_LESSON_BRIEF: LessonBrief = {
  title: "Git Branching and Merging",
  learningObjective:
    "Create and switch to a feature branch, merge it into another branch, and explain how to resolve a simple merge conflict.",
};

export type LessonBriefErrors = Partial<Record<keyof LessonBrief, string>>;

export function validateLessonBrief(brief: LessonBrief): LessonBriefErrors {
  const errors: LessonBriefErrors = {};

  if (!brief.title.trim()) {
    errors.title = "Add a lesson title to continue.";
  } else if (brief.title.trim().length > 120) {
    errors.title = "Keep the lesson title under 120 characters.";
  }

  if (!brief.learningObjective.trim()) {
    errors.learningObjective = "Add a learning objective to continue.";
  } else if (brief.learningObjective.trim().length > 500) {
    errors.learningObjective = "Keep the learning objective under 500 characters.";
  }

  return errors;
}
