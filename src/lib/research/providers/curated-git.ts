import type { LessonBrief, LessonSource } from "@/lib/lesson/types";

export const GIT_BRANCHING_SOURCES: LessonSource[] = [
  {
    id: "progit-branching",
    kind: "book",
    title: "Pro Git, Chapter 3: Git Branching",
    url: "https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging",
    publisher: "Scott Chacon and Ben Straub · Apress",
    relevanceNote: "Book chapter covering branch creation, switching, merging, and basic conflicts. The online edition is free to read.",
  },
  {
    id: "git-switch-docs",
    kind: "website",
    title: "git-switch documentation",
    url: "https://git-scm.com/docs/git-switch",
    publisher: "Git project",
    relevanceNote: "Primary reference for switching branches and creating a branch with git switch -c.",
  },
  {
    id: "git-merge-docs",
    kind: "website",
    title: "git-merge documentation",
    url: "https://git-scm.com/docs/git-merge",
    publisher: "Git project",
    relevanceNote: "Primary reference for merge behavior, fast-forward merges, merge commits, and conflict resolution.",
  },
  {
    id: "github-merge-conflicts",
    kind: "website",
    title: "About merge conflicts",
    url: "https://docs.github.com/en/pull-requests/reference/merge-conflicts",
    publisher: "GitHub Docs",
    relevanceNote: "Explains why overlapping changes can require a person to choose the final content.",
  },
  {
    id: "git-branches-video",
    kind: "youtube",
    title: "GitHub Branches Tutorial (Beginner Friendly)",
    url: "https://www.youtube.com/watch?v=0vzYWyHmcY8",
    publisher: "YouTube",
    relevanceNote: "Supplementary walkthrough of creating, switching, and merging branches, including a conflict example. Use Git’s manual for command details.",
  },
];

export function supportsGitBranchingSample(brief: LessonBrief): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const title = normalize(brief.title);
  const objective = normalize(brief.learningObjective);
  return title === "git branching and merging" && ["branch", "merge", "conflict"].every((term) => objective.includes(term));
}
