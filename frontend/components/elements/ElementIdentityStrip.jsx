"use client";

import ElementThumbnail from "@/components/elements/ElementThumbnail";

/**
 * Top strip on element-tagged canvas nodes — same thumbnail language as the sidebar.
 */
export default function ElementIdentityStrip({
  elementId,
  subElementName,
  elementName,
  trailing = null,
}) {
  const label = subElementName || elementName || "Element";

  return (
    <div className="flex items-center gap-2.5 border-b border-[#E5E5E5] bg-[#FAFAF7] px-3 py-2">
      <ElementThumbnail elementId={elementId} size="node" />
      <span className="min-w-0 flex-1 truncate font-serif text-[13px] leading-snug text-[#2A2A2A]">
        {label}
      </span>
      {trailing ? <div className="flex shrink-0 items-center gap-1.5">{trailing}</div> : null}
    </div>
  );
}
