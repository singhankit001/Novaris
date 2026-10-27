/** The six stages of the review workflow. Copy restates the page's existing claims; nothing here adds a capability. */
export interface WorkflowStage {
  id: string;
  title: string;
  /** One-line summary shown on the timeline. */
  summary: string;
  detail: string;
  /** Short facts pinned under the detail. */
  points: string[];
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "connect",
    title: "Connect a repository",
    summary: "A GitHub URL or owner/repo.",
    detail: "Point Novaris at a repository. It reads public data from the GitHub API, and private repositories only when you grant access.",
    points: ["GitHub URL or owner/repo", "Public data unless you grant access"],
  },
  {
    id: "explore",
    title: "Explore the files",
    summary: "The tree first, then whole files.",
    detail: "Novaris reads the file tree, then loads complete files chosen for your review question instead of fragments.",
    points: ["File tree read first", "Complete files, not snippets"],
  },
  {
    id: "dependencies",
    title: "Analyze dependencies",
    summary: "Imports and callers come along.",
    detail: "Because whole files are loaded, the imports and callers around a change are visible, so a modification is read with the modules it touches.",
    points: ["Imports and callers in view", "Adjacent modules considered"],
  },
  {
    id: "review",
    title: "AI code review",
    summary: "Review intent, read in context.",
    detail: "Novaris starts with review intent, then evaluates the change with broader repository context instead of reading the diff alone.",
    points: ["Starts from your review intent", "Repository context, not diff only"],
  },
  {
    id: "risks",
    title: "Detect risks",
    summary: "Side effects and regression risk.",
    detail: "The review highlights architecture side effects, dependency impact and probable risk areas, so reviewers know where regression risk is most likely.",
    points: ["Architecture side effects", "Dependency impact", "Probable risk areas"],
  },
  {
    id: "findings",
    title: "Actionable findings",
    summary: "Notes that point at file paths.",
    detail: "Review notes point at file paths, so teams can move from findings to concrete follow-up tasks with clearer ownership and sequencing.",
    points: ["Notes cite file paths", "Ready to turn into follow-up tasks"],
  },
];
