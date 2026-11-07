import { reviewLesson } from "@/lib/lesson/quality-review";
import { canRunAIReview, reviewLessonWithAI } from "@/lib/lesson/ai-review";
import type { LessonDraft, QCLayer } from "@/lib/lesson/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON review request." }, { status: 400 });
  }

  if (!isRecord(payload) || !isRecord(payload.lesson)) {
    return Response.json({ error: "A lesson draft is required." }, { status: 400 });
  }
  const layer = payload.layer;
  if (layer !== "factual-accuracy" && layer !== "instructional-quality") {
    return Response.json({ error: "Choose a factual or instructional review." }, { status: 400 });
  }

  const lesson = payload.lesson as unknown as LessonDraft;
  if (!isRecord(lesson.brief) || !Array.isArray(lesson.sections) || !Array.isArray(lesson.sources)) {
    return Response.json({ error: "The lesson draft is missing required content." }, { status: 400 });
  }

  try {
    const report = payload.useHeuristics === true
      ? reviewLesson(lesson, layer as QCLayer)
      : canRunAIReview(lesson, layer as QCLayer)
      ? await reviewLessonWithAI(lesson, layer as QCLayer)
      : reviewLesson(lesson, layer as QCLayer);
    return Response.json({ report });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "This review could not be completed. Your lesson draft is unchanged; retry." },
      { status: 502 },
    );
  }
}
