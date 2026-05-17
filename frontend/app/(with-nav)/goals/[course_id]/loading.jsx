import GoalWorkspaceLoading from "@/components/goal-workspace/GoalWorkspaceLoading";

/** Shown immediately on navigation — before the client page bundle hydrates. */
export default function GoalLoading() {
  return <GoalWorkspaceLoading useCachedTitle />;
}
