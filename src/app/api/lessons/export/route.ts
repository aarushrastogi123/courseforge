import { AlignmentType, Document, Footer, HeadingLevel, Header, Packer, PageNumber, Paragraph, TextRun } from "docx";
import type { LessonDraft, QCReport } from "@/lib/lesson/types";

const brand = "176044";
const ink = "20332B";
const muted = "5F6D64";

function line(text: string, options: { bold?: boolean; color?: string; size?: number; after?: number } = {}) {
  return new Paragraph({
    spacing: { before: 0, after: options.after ?? 150, line: 300 },
    children: [new TextRun({ text, bold: options.bold, color: options.color ?? ink, size: options.size ?? 22, font: "Aptos" })],
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 140 }, children: [new TextRun({ text, bold: true, color: brand, font: "Aptos Display" })] });
}

function documentFor(title: string, subtitle: string, children: Paragraph[]) {
  return new Document({
    creator: "CourseForge",
    title,
    description: subtitle,
    styles: {
      default: { document: { run: { font: "Aptos", size: 22, color: ink }, paragraph: { spacing: { line: 300, after: 140 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Aptos Display", size: 30, bold: true, color: brand }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Aptos Display", size: 25, bold: true, color: ink }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 1180, right: 1120, bottom: 1180, left: 1120 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "COURSEFORGE  /  INSTRUCTOR WORKSPACE", bold: true, color: brand, size: 16, characterSpacing: 20 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CourseForge  ·  Page ", color: muted, size: 16 }), new TextRun({ children: [PageNumber.CURRENT], color: muted, size: 16 })] })] }) },
      children: [
        new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: "COURSEFORGE  /  LESSON STUDIO", bold: true, color: brand, size: 18, characterSpacing: 35 })] }),
        new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: title, bold: true, color: ink, font: "Aptos Display", size: 42 })] }),
        new Paragraph({ spacing: { after: 320 }, children: [new TextRun({ text: subtitle, color: muted, size: 21 })] }),
        ...children,
      ],
    }],
  });
}

function addReport(paragraphs: Paragraph[], title: string, report: QCReport) {
  paragraphs.push(heading(title));
  paragraphs.push(line("Status: " + report.status + " · Method: " + (report.reviewMethod === "ai-assisted" ? "Model-assisted" + (report.model ? " (" + report.model + ")" : "") : report.reviewMethod === "heuristic" ? "Transparent heuristics" : "Not run"), { bold: true, color: muted }));
  paragraphs.push(line(report.summary, { after: 220 }));
  if (report.findings.length === 0) {
    paragraphs.push(line("No findings reported by this review.", { color: muted }));
    return;
  }
  for (const [index, finding] of report.findings.entries()) {
    paragraphs.push(heading(String(index + 1).padStart(2, "0") + "  " + finding.issue, HeadingLevel.HEADING_2));
    paragraphs.push(line("Severity: " + finding.severity.toUpperCase() + (finding.location ? " · Location: " + finding.location : ""), { bold: true, color: muted, size: 19 }));
    paragraphs.push(line(finding.explanation));
    paragraphs.push(line("Suggested improvement: " + finding.recommendation, { bold: true }));
    if (finding.sourceIds.length) paragraphs.push(line("Linked reference IDs: " + finding.sourceIds.join(", "), { color: muted, size: 18 }));
    if (finding.suggestedEdit) paragraphs.push(line("A proposed replacement is available in the saved review report. Apply it only after instructor review.", { color: muted, size: 18 }));
  }
}

function buildLessonDocument(lesson: LessonDraft) {
  const paragraphs: Paragraph[] = [
    heading("Learning objective"), line(lesson.brief.learningObjective),
    line("Planned duration: " + lesson.sections.reduce((sum, section) => sum + section.durationMinutes, 0) + " minutes", { bold: true, color: brand }),
  ];
  for (const [index, section] of lesson.sections.entries()) {
    paragraphs.push(heading(String(index + 1).padStart(2, "0") + "  " + section.heading));
    paragraphs.push(line(section.purpose, { bold: true, color: muted }));
    paragraphs.push(line("Teaching time: " + section.durationMinutes + " minutes", { bold: true, color: brand, size: 19 }));
    for (const contentParagraph of section.content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) paragraphs.push(line(contentParagraph));
  }
  paragraphs.push(heading("References"));
  for (const [index, source] of lesson.sources.entries()) {
    paragraphs.push(line(String(index + 1) + ". " + source.title, { bold: true }));
    paragraphs.push(line([source.kind.toUpperCase(), source.publisher, source.url].filter(Boolean).join(" · "), { color: muted, size: 18 }));
    if (source.relevanceNote) paragraphs.push(line(source.relevanceNote, { color: muted, size: 18, after: 220 }));
  }
  return documentFor(lesson.brief.title, "Final lesson draft with teaching notes and references", paragraphs);
}

function buildReportsDocument(lesson: LessonDraft) {
  const paragraphs: Paragraph[] = [
    heading("Lesson context"),
    line("Lesson: " + lesson.brief.title, { bold: true }),
    line("Learning objective: " + lesson.brief.learningObjective),
    line("Planned duration: " + lesson.targetDurationMinutes + " minutes · Sections: " + lesson.sections.length + " · References: " + lesson.sources.length, { color: muted }),
    line("These reports record the configured review method and its findings. They are advisory and do not constitute independent proof of factual accuracy or learning outcomes.", { color: muted, after: 260 }),
  ];
  addReport(paragraphs, "Layer 1 · Research and factual accuracy", lesson.qualityReports["factual-accuracy"]);
  addReport(paragraphs, "Layer 2 · Instructional quality and objective alignment", lesson.qualityReports["instructional-quality"]);
  paragraphs.push(heading("Reference register"));
  for (const [index, source] of lesson.sources.entries()) paragraphs.push(line(String(index + 1) + ". " + source.title + " · " + source.url, { color: muted, size: 18 }));
  return documentFor(lesson.brief.title + " — Quality reports", "Separate instructor review record for both QC layers", paragraphs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a valid document export request." }, { status: 400 });
  }
  if (!isRecord(payload) || !isRecord(payload.lesson)) return Response.json({ error: "A lesson draft is required." }, { status: 400 });
  const lesson = payload.lesson as unknown as LessonDraft;
  if (!isRecord(lesson.brief) || typeof lesson.brief.title !== "string" || typeof lesson.brief.learningObjective !== "string" || !Array.isArray(lesson.sections) || !Array.isArray(lesson.sources) || !isRecord(lesson.qualityReports)) {
    return Response.json({ error: "The lesson draft is missing content needed for export." }, { status: 400 });
  }
  const factualReport = lesson.qualityReports["factual-accuracy"];
  const instructionalReport = lesson.qualityReports["instructional-quality"];
  if (!isRecord(factualReport) || factualReport.status !== "complete" || !isRecord(instructionalReport) || instructionalReport.status !== "complete") {
    return Response.json({ error: "Run both quality checks before exporting finalized documents." }, { status: 409 });
  }
  const kind = payload.kind;
  if (kind !== "lesson" && kind !== "reports") return Response.json({ error: "Choose the lesson or quality reports document." }, { status: 400 });
  try {
    const document = kind === "lesson" ? buildLessonDocument(lesson) : buildReportsDocument(lesson);
    const buffer = await Packer.toBuffer(document);
    const safeTitle = lesson.brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
    const suffix = kind === "lesson" ? "lesson" : "quality-reports";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=\"" + safeTitle + "-" + suffix + ".docx\"",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "The Word document could not be prepared. Your saved lesson is unchanged; retry." }, { status: 500 });
  }
}
