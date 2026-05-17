import GoalWorkspaceLoading from "@/components/goal-workspace/GoalWorkspaceLoading";
import { GOAL_WORKSPACE_BACK, GOAL_WORKSPACE_SUPPORTING } from "@/components/goal-workspace/goalWorkspaceCopy";

export default function ForgeReadyLoading() {
  return (
    <GoalWorkspaceLoading
      useCachedTitle
      backHref="/goals"
      backLabel={GOAL_WORKSPACE_BACK.modes}
      supportingLine={GOAL_WORKSPACE_SUPPORTING.forge}
      label="Loading Forge"
    />
  );
}
