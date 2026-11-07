import type { LessonDraft, QCLayer, QCReport } from "@/lib/lesson/types";

const reviewLabels: Record<QCLayer, string> = {
  "factual-accuracy": "Factual review",
  "instructional-quality": "Teaching review",
};

export function lessonToMarkdown(lesson: LessonDraft, exportedAt = new Date().toISOString()) {
  const sectionMinutes = lesson.sections.reduce((sum, section) => sum + section.durationMinutes, 0);
  const lines = [
    `# ${lesson.brief.title}`,
    "",
    `**Learning objective:** ${lesson.brief.learningObjective}`,
    `**Planned duration:** ${sectionMinutes} minutes (target: ${lesson.targetDurationMinutes} minutes)`,
    "**Research status:** " + (lesson.generationMethod === "ai-assisted" ? "Live web, book-catalog, and YouTube search; lesson drafted with " + (lesson.model || "the configured model") + "." : "Curated example; no live research or AI generation was used."),
    "**QC limitation:** Model-assisted reports compare only retrieved excerpts and can be wrong; heuristic reports check structure and links only. Instructor verification is required.",
    "",
    "## Lesson plan",
    "",
  ];

  for (const [index, section] of lesson.sections.entries()) {
    const sources = lesson.sources.filter((source) => section.sourceIds.includes(source.id));
    lines.push(
      `### ${index + 1}. ${section.heading} (${section.durationMinutes} min)`,
      "",
      `**Purpose:** ${section.purpose}`,
      "",
      section.content,
      "",
      sources.length ? `**Sources:** ${sources.map((source) => `[${source.title}](${source.url})`).join(" · ")}` : "**Sources:** None linked",
      "",
    );
    if (section.claims?.length) {
      lines.push("**Claim evidence:**");
      for (const claim of section.claims) {
        const evidence = lesson.sources.filter((source) => claim.sourceIds.includes(source.id));
        lines.push(`- ${claim.text}${evidence.length ? ` — ${evidence.map((source) => `[${source.title}](${source.url})`).join(" · ")}` : " — No linked evidence"}`);
      }
      lines.push("");
    }
  }

  lines.push("## References", "");
  if (lesson.sources.length) {
    for (const source of lesson.sources) {
      const details = [source.publisher, source.kind.toUpperCase(), source.relevanceNote].filter(Boolean).join(" · ");
      lines.push(`- [${source.title}](${source.url})${details ? ` — ${details}` : ""}`);
    }
  } else {
    lines.push("No references included.");
  }

  const excerptSources = lesson.sources.filter((source) => source.kind === "website" && source.evidenceExcerpt?.trim());
  if (excerptSources.length) {
    lines.push("", "## Retrieved source excerpts", "");
    for (const source of excerptSources) {
      lines.push("### " + source.title, "", "Source: [" + source.title + "](" + source.url + ")", "", source.evidenceExcerpt!.replace(/\s+/g, " ").slice(0, 2200), "");
    }
  }

  lines.push("", "## Quality reviews", "");
  const layers: QCLayer[] = ["factual-accuracy", "instructional-quality"];
  for (const layer of layers) {
    appendReport(lines, reviewLabels[layer], lesson.qualityReports[layer]);
  }

  lines.push("", "---", `Exported ${exportedAt}`, "");
  return lines.join("\n");
}

function appendReport(lines: string[], title: string, report: QCReport) {
  lines.push(`### ${title}`, "");
  if (report.status !== "complete") {
    lines.push("Not run yet.", "");
    return;
  }
  lines.push(report.summary, "");
  lines.push("**Method:** " + (report.reviewMethod === "ai-assisted" ? "Model-assisted" + (report.model ? " (" + report.model + ")" : "") : "Heuristic checks"), "");
  if (!report.findings.length) {
    lines.push("No findings.", "");
    return;
  }
  for (const finding of report.findings) {
    const location = finding.location ? ` — ${finding.location}` : "";
    lines.push(`- **${finding.severity.toUpperCase()}${location}:** ${finding.issue}`, `  ${finding.explanation}`, `  **Suggested next step:** ${finding.recommendation}`);
    if (finding.suggestedEdit) lines.push("  **Proposed section wording (" + finding.suggestedEdit.sectionId + "):** " + finding.suggestedEdit.replacementContent);
  }
  lines.push("");
}
