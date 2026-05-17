"use client";

import ElementThumbnail from "@/components/elements/ElementThumbnail";
import FireStarterImage from "@/components/goals/FireStarterImage";
import { headlineLgClass } from "@/components/goals/goalWorkspaceStyles";

export const FIRE_STARTER_CARD_BG = "#FAF8F2";

const CARD_EYEBROW =
  "font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent-blue";

function normalizeElementId(id) {
  const s = (id || "").toLowerCase();
  if (s === "synthesis") return "change";
  return s;
}

function formatEarnedDate(iso) {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

/**
 * Trophy-style Fire Starter artifact card (Forge grid, goal workspace).
 */
export default function FireStarterCard({ fireStarter, onSelect, className = "" }) {
  const elements = (fireStarter.element_combination || [])
    .map(normalizeElementId)
    .filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(fireStarter)}
      className={`group flex h-full min-h-[14rem] w-full cursor-pointer flex-col overflow-hidden rounded-[10px] border border-[#E5E5E5] p-0 text-left shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 ${className}`}
      style={{ backgroundColor: FIRE_STARTER_CARD_BG }}
    >
      <FireStarterImage fireStarter={fireStarter} />

      <div className="flex flex-1 flex-col p-7 pt-5">
        <p className={CARD_EYEBROW}>Fire Starter</p>

        {elements.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {elements.map((el) => (
              <ElementThumbnail key={el} elementId={el} size="card" />
            ))}
          </div>
        ) : null}

        <h3
          className={`${headlineLgClass} mt-4 text-[clamp(1.375rem,2vw,1.625rem)] leading-snug text-[#1A1A1A]`}
        >
          {fireStarter.name}
        </h3>

        <p className="mt-3 flex-1 text-[15px] font-normal leading-[1.5] text-[#4A4A4A] line-clamp-2">
          {fireStarter.description}
        </p>

        <p className="mt-6 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#999999]">
          Earned {formatEarnedDate(fireStarter.created_at)}
        </p>
      </div>
    </button>
  );
}
