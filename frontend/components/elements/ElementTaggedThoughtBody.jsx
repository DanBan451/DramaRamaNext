"use client";

import ElementIdentityStrip from "@/components/elements/ElementIdentityStrip";
import { FIRE_STARTER_STYLE } from "@/lib/canvas-palette";

function MetaPill({ children, title, className }) {
  return (
    <span
      className={
        className ??
        "shrink-0 rounded border border-mist bg-mist px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-smoke"
      }
      title={title}
    >
      {children}
    </span>
  );
}

/**
 * Inner layout for element-tagged thoughts (user, nudge, fire starter).
 * Terrain and untagged nodes use a different layout in the canvas components.
 */
export default function ElementTaggedThoughtBody({
  elementId,
  subElementName,
  elementName,
  isFireStarterNode = false,
  isNudge = false,
  isReflection = false,
  content,
  contentClassName = "text-sm font-medium leading-relaxed text-[#2A2A2A]",
  createdAt,
  onConnectorClick,
  footerExtra = null,
}) {
  const stripTrailing = (
    <>
      {isNudge ? (
        <MetaPill title="AI-generated nudge — drag, edit, or delete it like your own thoughts.">
          Nudge
        </MetaPill>
      ) : null}
      {isReflection ? (
        <MetaPill title="Reflection thought from Stage 3.">Reflection</MetaPill>
      ) : null}
      {isFireStarterNode ? (
        <MetaPill className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${FIRE_STARTER_STYLE.pillClass}`}>
          Fire Starter
        </MetaPill>
      ) : null}
    </>
  );

  return (
    <>
      <ElementIdentityStrip
        elementId={elementId}
        subElementName={subElementName}
        elementName={elementName}
        trailing={stripTrailing}
      />
      <div className="px-4 py-3">
        <p className={`whitespace-pre-wrap ${contentClassName}`}>{content}</p>
      </div>
      <div className="flex items-center justify-between px-4 pb-3 pt-0">
        <span className="text-[10px] text-[#888888]">{createdAt}</span>
        <div className="flex items-center gap-2">
          {footerExtra}
          {onConnectorClick ? (
            <button
              type="button"
              data-connector
              onClick={onConnectorClick}
              className="h-5 w-5 rounded-full border-2 border-[#CCCCCC] bg-white transition-transform hover:scale-110"
              title="Drag to connect to another thought"
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
