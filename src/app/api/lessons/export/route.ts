import { lessonToMarkdown } from "@/lib/lesson/markdown-export";
import type { LessonDraft } from "@/lib/lesson/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a valid Markdown export request." }, { status: 400 });
  }

  if (!isRecord(payload) || !isRecord(payload.lesson)) {
    return Response.json({ error: "A lesson draft is required." }, { status: 400 });
  }
  const lesson = payload.lesson;
  if (
    !isRecord(lesson.brief) ||
    typeof lesson.brief.title !== "string" ||
    typeof lesson.brief.learningObjective !== "string" ||
    !Array.isArray(lesson.sections) ||
    !Array.isArray(lesson.sources) ||
    !isRecord(lesson.qualityReports)
  ) {
    return Response.json({ error: "The lesson draft is missing content needed for export." }, { status: 400 });
  }

  const factualReport = lesson.qualityReports["factual-accuracy"];
  const instructionalReport = lesson.qualityReports["instructional-quality"];
  if (
    !isRecord(factualReport) || factualReport.status !== "complete" ||
    !isRecord(instructionalReport) || instructionalReport.status !== "complete"
  ) {
    return Response.json(
      { error: "Run both quality checks before exporting the finalized lesson package." },
      { status: 409 },
    );
  }

  return new Response(lessonToMarkdown(lesson as unknown as LessonDraft), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment; filename=courseforge-lesson.md",
      "Cache-Control": "no-store",
    },
  });
}
