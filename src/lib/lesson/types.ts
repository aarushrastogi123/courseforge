export type LessonBrief = {
  title: string;
  learningObjective: string;
};

export type LessonSourceKind = "book" | "website" | "youtube";

export type LessonSource = {
  id: string;
  kind: LessonSourceKind;
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  accessedAt?: string;
  relevanceNote?: string;
  evidenceExcerpt?: string;
};

export type LessonClaim = {
  id: string;
  text: string;
  sourceIds: string[];
};

export type LessonSection = {
  id: string;
  heading: string;
  purpose: string;
  durationMinutes: number;
  content: string;
  sourceIds: string[];
  claims?: LessonClaim[];
};

export type QCFindingSeverity = "low" | "medium" | "high";
export type QCLayer = "factual-accuracy" | "instructional-quality";
export type QCReportStatus = "pending" | "complete";

export type QCFinding = {
  id: string;
  severity: QCFindingSeverity;
  location?: string;
  issue: string;
  explanation: string;
  recommendation: string;
  sourceIds: string[];
  suggestedEdit?: {
    sectionId: string;
    replacementContent: string;
  };
};

export type QCReport = {
  layer: QCLayer;
  status: QCReportStatus;
  summary: string;
  findings: QCFinding[];
  reviewMethod?: "heuristic" | "ai-assisted";
  model?: string;
  generatedAt?: string;
};

export type LessonDraft = {
  id: string;
  brief: LessonBrief;
  generationMethod?: "curated" | "ai-assisted";
  model?: string;
  targetDurationMinutes: 45;
  sections: LessonSection[];
  sources: LessonSource[];
  qualityReports: Record<QCLayer, QCReport>;
  createdAt: string;
  updatedAt: string;
};
