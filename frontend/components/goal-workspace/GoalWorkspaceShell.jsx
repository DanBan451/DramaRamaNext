/**
 * Shared page shell for goal workspace routes — identical horizontal band and top spacing
 * so the persistent goal title does not shift between landing, Forge, and Ignite.
 */
export const goalWorkspacePageClass =
  "min-h-screen bg-white pb-16 pt-[calc(var(--navbar-height,5rem)+2.5rem)]";

export default function GoalWorkspaceShell({ header, children, className = "" }) {
  return (
    <div className={`${goalWorkspacePageClass} ${className}`.trim()}>
      <div className="nav-shell box-border w-full">{header}</div>
      {children}
    </div>
  );
}
