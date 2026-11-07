import type {
  LessonDraft,
  QCFinding,
  QCLayer,
  QCReport,
} from "@/lib/lesson/types";

/**
 * Transparent starter checks. These are structural heuristics, not an AI fact
 * checker and not proof that lesson claims are correct.
 */
export function reviewLesson(lesson: LessonDraft, layer: QCLayer): QCReport {
  const findings: QCFinding[] = [];

  if (layer === "factual-accuracy") {
    const uncited = lesson.sections.filter((section) => section.sourceIds.length === 0);
    if (uncited.length) {
      findings.push({
        id: "factual-uncited-sections",
        severity: "high",
        location: uncited.map((section) => section.heading).join(", "),
        issue: "Some lesson sections have no linked sources.",
        explanation: `${uncited.length} section${uncited.length === 1 ? " is" : "s are"} not connected to a reference in the source list.`,
        recommendation: "Add a reliable reference for each factual explanation, or mark it clearly as an instructor activity.",
        sourceIds: [],
      });
    }

    const insecureSources = lesson.sources.filter((source) => !source.url.startsWith("https://"));
    if (insecureSources.length) {
      findings.push({
        id: "factual-insecure-links",
        severity: "medium",
        location: "Reference library",
        issue: "One or more references do not use a secure link.",
        explanation: "Secure links reduce the chance that learners are sent to an altered or intercepted page.",
        recommendation: "Replace these links with the publisher’s HTTPS page.",
        sourceIds: insecureSources.map((source) => source.id),
      });
    }

    const thinSourceRecords = lesson.sources.filter((source) => !source.title.trim() || !source.publisher?.trim() || !source.relevanceNote?.trim());
    if (thinSourceRecords.length) {
      findings.push({
        id: "factual-source-metadata",
        severity: "low",
        location: "Reference library",
        issue: "Some references are missing publisher or relevance details.",
        explanation: "The brief metadata helps an instructor judge who published a source and why it was selected.",
        recommendation: "Add the publisher and a short note explaining which lesson concepts the reference supports.",
        sourceIds: thinSourceRecords.map((source) => source.id),
      });
    }

    const sourceIds = new Set(lesson.sources.map((source) => source.id));
    const brokenLinks = lesson.sections.flatMap((section) =>
      section.sourceIds.filter((id) => !sourceIds.has(id)).map((id) => ({ section, id })),
    );
    if (brokenLinks.length) {
      findings.push({
        id: "factual-missing-source-records",
        severity: "high",
        location: "Section references",
        issue: "A section points to a reference that is missing from the library.",
        explanation: "Learners and instructors cannot inspect a source unless its record is present.",
        recommendation: "Restore the missing source record or remove the dangling citation.",
        sourceIds: [],
      });
    }

    const claims = lesson.sections.flatMap((section) =>
      (section.claims ?? []).map((claim) => ({ section, claim })),
    );
    const unmappedClaims = claims.filter(({ claim }) => !claim.text.trim() || claim.sourceIds.length === 0);
    if (unmappedClaims.length) {
      findings.push({
        id: "factual-unmapped-claims",
        severity: "high",
        location: unmappedClaims.map(({ section }) => section.heading).join(", "),
        issue: "Some identified claims have no linked evidence.",
        explanation: `${unmappedClaims.length} claim${unmappedClaims.length === 1 ? " has" : "s have"} no source attached, so an instructor cannot trace it to the research set.`,
        recommendation: "Attach a relevant source to each claim or remove the claim mapping until evidence is available.",
        sourceIds: [],
      });
    }

    const unlistedEvidence = claims.flatMap(({ section, claim }) =>
      claim.sourceIds.filter((id) => !sourceIds.has(id) || !section.sourceIds.includes(id)).map((id) => ({ section, id })),
    );
    if (unlistedEvidence.length) {
      findings.push({
        id: "factual-unlisted-evidence",
        severity: "high",
        location: "Claim evidence links",
        issue: "Some claim evidence links do not match the lesson’s reference library or section citations.",
        explanation: "A claim can only be reviewed when its linked source exists and is listed with that section.",
        recommendation: "Add the missing source to the reference library and section, or remove the invalid link.",
        sourceIds: [],
      });
    }

    const videoOnlyClaims = claims.filter(({ claim }) =>
      claim.sourceIds.length > 0 && claim.sourceIds.every((id) => lesson.sources.find((source) => source.id === id)?.kind === "youtube"),
    );
    if (videoOnlyClaims.length) {
      findings.push({
        id: "factual-video-only-evidence",
        severity: "medium",
        location: videoOnlyClaims.map(({ section }) => section.heading).join(", "),
        issue: "Some claims rely only on a video reference.",
        explanation: "Videos can help teach a concept, but a written technical source is easier to inspect for exact definitions and details.",
        recommendation: "Add a relevant book chapter or authoritative written reference alongside the video.",
        sourceIds: [...new Set(videoOnlyClaims.flatMap(({ claim }) => claim.sourceIds))],
      });
    }

    const sectionsWithoutClaimMap = lesson.sections.filter((section) => !(section.claims?.length));
    if (sectionsWithoutClaimMap.length) {
      findings.push({
        id: "factual-section-claim-map",
        severity: "medium",
        location: sectionsWithoutClaimMap.map((section) => section.heading).join(", "),
        issue: "Some sections do not have claim-level evidence links.",
        explanation: "Section citations give a useful overview, but claim-level links make it easier to verify individual statements.",
        recommendation: "Identify the key factual statements in each section and attach their supporting references.",
        sourceIds: [],
      });
    }

    findings.push({
      id: "factual-human-verification",
      severity: "medium",
      location: "All lesson claims",
      issue: "Claim accuracy and source contents still need instructor verification.",
      explanation: "This review checks whether identified claims have traceable links, plus basic link structure. It does not open or compare source contents against claim wording.",
      recommendation: "Open each cited material and confirm it supports the claim, especially for critical facts and examples.",
      sourceIds: lesson.sources.map((source) => source.id),
    });

    return {
      layer,
      status: "complete",
      reviewMethod: "heuristic",
      summary: findings.length === 1
        ? "The basic citation structure looks complete; source contents still need a human check."
        : `${findings.length} items need review. This starter check is not proof of factual accuracy.`,
      findings,
      generatedAt: new Date().toISOString(),
    };
  }

  const duration = lesson.sections.reduce((total, section) => total + section.durationMinutes, 0);
  if (duration !== lesson.targetDurationMinutes) {
    findings.push({
      id: "instructional-timing",
      severity: "medium",
      location: "Lesson timing",
      issue: `The sections total ${duration} minutes, not the ${lesson.targetDurationMinutes}-minute target.`,
      explanation: "The lesson may not fit the time available for learners.",
      recommendation: "Adjust section timings to match the target, including transitions and learner questions.",
      sourceIds: [],
    });
  }

  if (!lesson.brief.learningObjective.trim()) {
    findings.push({
      id: "instructional-objective",
      severity: "high",
      location: "Lesson brief",
      issue: "No learning objective is available to align the lesson with.",
      explanation: "Without an outcome, it is hard to tell whether examples and checks teach the intended skill.",
      recommendation: "Add a measurable objective that describes what learners will be able to do.",
      sourceIds: [],
    });
  }

  const thinSections = lesson.sections.filter((section) => !section.purpose.trim() || !section.content.trim());
  if (thinSections.length) {
    findings.push({
      id: "instructional-incomplete-sections",
      severity: "medium",
      location: thinSections.map((section) => section.heading).join(", "),
      issue: "Some sections are missing an explanation or a clear teaching purpose.",
      explanation: "Learners benefit when each part of a lesson makes its role explicit.",
      recommendation: "Add a concise explanation and state what learners should practise in each section.",
      sourceIds: [],
    });
  }

  const learningTerms = lesson.brief.learningObjective.toLowerCase().match(/[a-z0-9-]{5,}/g) ?? [];
  const ignoredTerms = new Set(["about", "after", "again", "among", "another", "before", "between", "could", "their", "there", "these", "those", "through", "using", "which", "while", "would", "learners"]);
  const termsToCheck = [...new Set(learningTerms)].filter((term) => !ignoredTerms.has(term));
  const lessonText = lesson.sections.map((section) => `${section.heading} ${section.purpose} ${section.content}`).join(" ").toLowerCase();
  const objectiveEquivalents: Record<string, string[]> = {
    categories: ["category", "class", "classes"],
    "cache-miss": ["cache miss", "cache-miss", "miss on a cache"],
    shorten: ["shorten", "shorter", "reduce", "speed up", "speeding up", "accelerate"],
    later: ["later", "subsequent", "future", "repeat"],
  };
  const unaddressedTerms = termsToCheck.filter((term) =>
    !(objectiveEquivalents[term] ?? [term]).some((candidate) => lessonText.includes(candidate)),
  );
  if (unaddressedTerms.length) {
    findings.push({
      id: "instructional-objective-alignment",
      severity: "medium",
      location: "Learning objective",
      issue: "Some important objective terms are not mentioned in the lesson outline.",
      explanation: `A simple word-overlap check did not find: ${unaddressedTerms.join(", ")}. This can miss synonyms and context.`,
      recommendation: "Check that learners practise every action and concept named in the objective, using equivalent wording where appropriate.",
      sourceIds: [],
    });
  }

  const allLessonText = lessonText;
  const coverageGaps = [
    { label: "practical activity", pattern: /practical application|application task|activity|practice|pair|scenario|try this|exercise|lab/ },
    { label: "example", pattern: /example|for instance|e\.g\./ },
    { label: "knowledge check", pattern: /knowledge check|exit ticket|recap|quiz|check for understanding/ },
  ].filter((item) => !item.pattern.test(allLessonText));
  if (coverageGaps.length) {
    findings.push({
      id: "instructional-coverage",
      severity: "low",
      location: "Lesson activities",
      issue: `The outline may be missing a ${coverageGaps.map((item) => item.label).join(", ")}.`,
      explanation: "This quick wording check can miss equivalent activities and does not judge whether an existing activity is effective.",
      recommendation: "Review the lesson flow and add any missing practice, examples, or learner checks that fit the objective.",
      sourceIds: [],
    });
  }

  if (!findings.length) {
    findings.push({
      id: "instructional-review-prompts",
      severity: "low",
      location: "Instructor review",
      issue: "The outline passes the available structure checks.",
      explanation: "Timing and required lesson fields are present. These checks cannot judge learner level, pacing, or whether an activity works in your classroom.",
      recommendation: "Review the examples and activities against your learners’ prior knowledge before teaching.",
      sourceIds: [],
    });
  }

  return {
    layer,
    status: "complete",
    reviewMethod: "heuristic",
    summary: findings.some((finding) => finding.severity === "high")
      ? `${findings.length} instructional item${findings.length === 1 ? "" : "s"} need attention.`
      : "The outline passes basic structure checks; review the teaching choices for your class.",
    findings,
    generatedAt: new Date().toISOString(),
  };
}
