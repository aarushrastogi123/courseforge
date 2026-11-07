import { connection } from "next/server";
import { buildHttpSampleDraft } from "@/lib/lesson/build-http-sample";
import { buildGitBranchingDraft } from "@/lib/lesson/build-git-sample";
import { validateLessonBrief } from "@/lib/lesson/brief";
import type { LessonBrief } from "@/lib/lesson/types";
import { supportsHttpSample } from "@/lib/research/providers/curated-http";
import { supportsGitBranchingSample } from "@/lib/research/providers/curated-git";
import { buildResearchedLesson, getLiveResearchReadiness } from "@/lib/research/live-research";

export async function GET() {
  await connection();
  return Response.json({ liveResearch: getLiveResearchReadiness() });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON lesson brief." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return Response.json({ error: "A lesson title and objective are required." }, { status: 400 });
  }

  const brief: LessonBrief = {
    title: typeof payload.title === "string" ? payload.title : "",
    learningObjective:
      typeof payload.learningObjective === "string" ? payload.learningObjective : "",
  };
  const errors = validateLessonBrief(brief);

  if (Object.keys(errors).length > 0) {
    return Response.json(
      { error: "Add both a lesson title and a learning objective.", fields: errors },
      { status: 400 },
    );
  }

  if (supportsHttpSample(brief)) {
    return Response.json({ lesson: buildHttpSampleDraft(brief) });
  }

  if (supportsGitBranchingSample(brief)) {
    return Response.json({ lesson: buildGitBranchingDraft(brief) });
  }

  try {
    return Response.json({ lesson: await buildResearchedLesson(brief) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The lesson draft could not be prepared. Your brief is preserved; retry.";
    const status = message.startsWith("Live research is not configured") ? 503 : 502;
    return Response.json({ error: message }, { status });
  }
}
