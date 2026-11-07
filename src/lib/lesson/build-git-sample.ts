import type { LessonBrief, LessonDraft, LessonSection } from "@/lib/lesson/types";
import { GIT_BRANCHING_SOURCES } from "@/lib/research/providers/curated-git";

const sections: LessonSection[] = [
  {
    id: "git-branch-idea",
    heading: "A branch is a separate line of work",
    purpose: "Explain how branches let a developer work on a change without mixing it into another line of work immediately.",
    durationMinutes: 5,
    sourceIds: ["progit-branching"],
    claims: [{ id: "git-branch-pointer", text: "A Git branch is a lightweight pointer to a commit, so creating one does not copy the whole project history.", sourceIds: ["progit-branching"] }],
    content: ["Example: a team updating a course website needs to add a course card while the published version must keep working. A branch gives the change its own path through project history, so the team can build and review it separately before combining it.", "A branch is not a second folder containing a full duplicate project. It is a named pointer in the commit history. New commits move the pointer for the branch you are currently using."].join("\n\n"),
  },
  {
    id: "git-create-switch",
    heading: "Create and switch to a feature branch",
    purpose: "Use a branch command to start an isolated feature and confirm which branch is active.",
    durationMinutes: 10,
    sourceIds: ["git-switch-docs", "progit-branching"],
    claims: [
      { id: "git-switch-create", text: "git switch -c <name> creates a new branch and switches to it in one operation.", sourceIds: ["git-switch-docs"] },
      { id: "git-branch-active", text: "New commits are added to the branch currently checked out.", sourceIds: ["git-switch-docs"] },
    ],
    content: ["Start from the repository's main branch and create a working branch for the course card:", "```text\ngit switch main\ngit switch -c feature/course-card\n```", "Make a small change, inspect it, then save it as a commit:", "```text\ngit status\ngit add course-card.md\ngit commit -m \"Add course card\"\n```", "The `-c` option asks Git to create and switch to the new branch. Check `git status` to see the active branch. Git may stop a switch if it would overwrite local changes, so commit or safely set aside work before changing branches."].join("\n\n"),
  },
  {
    id: "git-merge-work",
    heading: "Bring finished work into another branch",
    purpose: "Merge a feature branch into the branch that should receive its changes.",
    durationMinutes: 10,
    sourceIds: ["git-merge-docs", "progit-branching"],
    claims: [
      { id: "git-merge-target", text: "git merge integrates changes from another branch into the currently checked-out branch.", sourceIds: ["git-merge-docs"] },
      { id: "git-fast-forward", text: "When the current branch tip is an ancestor of the other branch tip, Git can move the branch pointer forward without creating a merge commit.", sourceIds: ["git-merge-docs"] },
    ],
    content: ["When the feature is ready, switch to the branch that should receive it, then name the feature branch in `git merge`:", "```text\ngit switch main\ngit merge feature/course-card\n```", "The branch you are on is the destination. If its history has not diverged, Git may fast-forward the branch pointer. If both branches have new commits, Git can create a merge commit that records the combined history. Review the result with `git status` and your usual project checks."].join("\n\n"),
  },
  {
    id: "git-conflict-resolution",
    heading: "Resolve a simple merge conflict",
    purpose: "Recognize a conflict and describe the human decision needed to finish the merge.",
    durationMinutes: 10,
    sourceIds: ["git-merge-docs", "github-merge-conflicts", "progit-branching"],
    claims: [
      { id: "git-conflict-overlap", text: "Git may need human help when branches make competing changes to the same part of a file.", sourceIds: ["git-merge-docs", "github-merge-conflicts"] },
      { id: "git-conflict-resolution", text: "After resolving conflict markers, stage the resolved file and complete the merge.", sourceIds: ["git-merge-docs"] },
    ],
    content: ["Suppose two branches change the same line of `course-card.md`. Git cannot know which wording the team wants, so it pauses and marks the conflict in the file. In a simple text conflict, the file shows the current branch's version, a divider, and the incoming branch's version.", "Read both versions and choose or combine the intended content. Remove the conflict markers, save the file, and inspect it. Then finish the merge:", "```text\ngit add course-card.md\ngit merge --continue\n```", "The decision about the final wording belongs to the people who understand the change. If you need to abandon the in-progress merge, Git provides `git merge --abort`; check the project state before doing so."].join("\n\n"),
  },
  {
    id: "git-practice-check",
    heading: "Practice and knowledge check",
    purpose: "Apply the create, switch, merge, and conflict-resolution steps to a short team scenario.",
    durationMinutes: 10,
    sourceIds: ["git-switch-docs", "git-merge-docs", "github-merge-conflicts", "git-branches-video"],
    claims: [
      { id: "git-merge-scenario", text: "For a merge command, Git integrates the named branch into the branch currently checked out.", sourceIds: ["git-merge-docs"] },
      { id: "git-conflict-human-choice", text: "A conflict requires a person to choose the final content when Git cannot safely combine competing edits.", sourceIds: ["github-merge-conflicts"] },
    ],
    content: ["Pair activity (5 minutes): One learner describes the course-card change, and the other gives the commands to create `feature/course-card`, switch back to `main`, and merge the feature. Swap roles.", "Knowledge check (3 minutes):\n1. Which branch receives changes in `git switch main` followed by `git merge feature/course-card`? Answer: `main`, because it is checked out when the merge starts.\n2. Does every merge create a merge commit? Answer: no. A fast-forward can move the branch pointer without one.\n3. Why can a conflict happen? Answer: Git cannot automatically choose between competing edits, such as changes to the same part of a file.", "Wrap up (2 minutes): Ask learners to explain who decides the final text in a conflict and how they mark the resolution complete."].join("\n\n"),
  },
];

export function buildGitBranchingDraft(brief: LessonBrief): LessonDraft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    generationMethod: "curated",
    brief: { title: brief.title.trim(), learningObjective: brief.learningObjective.trim() },
    targetDurationMinutes: 45,
    sections,
    sources: GIT_BRANCHING_SOURCES,
    qualityReports: {
      "factual-accuracy": { layer: "factual-accuracy", status: "pending", summary: "Run the claim-evidence review after the lesson is drafted.", findings: [] },
      "instructional-quality": { layer: "instructional-quality", status: "pending", summary: "Run the learning-design review after the lesson is drafted.", findings: [] },
    },
    createdAt: now,
    updatedAt: now,
  };
}
