"use client";

import { useParams } from "next/navigation";
import CreativeSpinner from "@/components/CreativeSpinner";
import GoalWorkspaceHeader from "@/components/goal-workspace/GoalWorkspaceHeader";
import GoalWorkspaceShell from "@/components/goal-workspace/GoalWorkspaceShell";
import {
  GOAL_WORKSPACE_BACK,
  GOAL_WORKSPACE_SUPPORTING,
} from "@/components/goal-workspace/goalWorkspaceCopy";
import { readCachedGoalTitle } from "@/lib/goal-title-cache";

/**
 * Instant goal-workspace loading chrome — used by route loading.tsx and inline while data fetches.
 */
export default function GoalWorkspaceLoading({
  backHref = "/goals",
  backLabel = GOAL_WORKSPACE_BACK.allGoals,
  goalTitle: goalTitleProp,
  supportingLine = GOAL_WORKSPACE_SUPPORTING.landing,
  label = "Loading goal",
  useCachedTitle = false,
}) {
  const params = useParams();
  const courseId = params?.course_id;
  const cached = useCachedTitle && courseId ? readCachedGoalTitle(courseId) : "";
  const goalTitle = goalTitleProp || cached || "Your goal";

  return (
    <GoalWorkspaceShell
      header={
        <GoalWorkspaceHeader
          backHref={backHref}
          backLabel={backLabel}
          goalTitle={goalTitle}
          supportingLine={supportingLine}
        />
      }
    >
      <div className="nav-shell flex min-h-[50vh] items-center justify-center">
        <CreativeSpinner label={label} />
      </div>
    </GoalWorkspaceShell>
  );
}
