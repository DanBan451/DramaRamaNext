"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import ElementThumbnail from "@/components/elements/ElementThumbnail";
import { FIRE_STARTER_CARD_BG } from "@/components/goals/FireStarterCard";
import FireStarterImage from "@/components/goals/FireStarterImage";
import { headlineLgClass } from "@/components/goals/goalWorkspaceStyles";
import { getElement } from "@/lib/elements";

const MODAL_EYEBROW =
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

export default function FireStarterDetailModal({ fireStarter, onClose }) {
  const titleId = useId();

  const elements = (fireStarter?.element_combination || [])
    .map(normalizeElementId)
    .filter(Boolean);

  const elementLabels = elements
    .map((id) => getElement(id)?.name)
    .filter(Boolean);

  useEffect(() => {
    if (!fireStarter) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fireStarter, onClose]);

  if (!fireStarter) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[12px] border border-[#E5E5E5] shadow-xl"
        style={{ backgroundColor: FIRE_STARTER_CARD_BG }}
        onClick={(e) => e.stopPropagation()}
      >
        <FireStarterImage fireStarter={fireStarter} className="rounded-t-[12px]" />

        <div className="relative p-8 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-[#888888] transition-colors hover:bg-black/5 hover:text-[#1A1A1A]"
          aria-label="Close"
        >
          Close
        </button>

        <p className={MODAL_EYEBROW}>Fire Starter</p>

        {elements.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {elements.map((el) => (
              <ElementThumbnail key={el} elementId={el} size="sidebar" />
            ))}
            {elementLabels.length > 0 ? (
              <p className="font-sans text-sm font-medium text-[#4A4A4A]">
                {elementLabels.join(" + ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <h2
          id={titleId}
          className={`${headlineLgClass} mt-5 pr-12 text-[clamp(1.5rem,3vw,1.875rem)] leading-snug text-[#1A1A1A]`}
        >
          {fireStarter.name}
        </h2>

        <p className="mt-4 whitespace-pre-wrap text-[15px] font-normal leading-[1.6] text-[#4A4A4A]">
          {fireStarter.description}
        </p>

        <p className="mt-6 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#999999]">
          Earned {formatEarnedDate(fireStarter.created_at)}
        </p>

        {fireStarter.course_puzzle_id ? (
          <Link
            href={`/canvas/${fireStarter.course_puzzle_id}`}
            className="mt-6 inline-block font-sans text-sm font-semibold text-change no-underline transition-colors hover:underline"
            onClick={onClose}
          >
            View the Forge puzzle where you earned this →
          </Link>
        ) : null}
        </div>
      </div>
    </div>
  );
}
