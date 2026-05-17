"use client";

import { useState } from "react";
import Link from "next/link";
import FireStarterCard from "@/components/goals/FireStarterCard";
import FireStarterDetailModal from "@/components/goals/FireStarterDetailModal";
import {
  bodyClass,
  eyebrowClass,
  headlineLgClass,
  primaryLinkClass,
} from "@/components/goals/goalWorkspaceStyles";

export default function FireStartersLibrary({
  fireStarters,
  forgeHref,
  loading,
  emptyMessage = "Complete a Forge session to earn your first Fire Starter.",
}) {
  const hasItems = Array.isArray(fireStarters) && fireStarters.length > 0;
  const [selectedFireStarter, setSelectedFireStarter] = useState(null);

  return (
    <section className="mt-16" aria-labelledby="fire-starters-heading">
      <p className={eyebrowClass}>Earned Patterns</p>
      <h2
        id="fire-starters-heading"
        className={`${headlineLgClass} mt-3 text-[clamp(1.75rem,2.2vw,2rem)] text-[#1A1A1A]`}
      >
        Your Fire Starters
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] font-normal leading-[1.5] text-[#4A4A4A]">
        Combinations of elements that worked. Apply them when you face a similar problem in Ignite.
      </p>

      {loading ? (
        <p className={`${bodyClass} mt-6 text-smoke`}>Loading…</p>
      ) : hasItems ? (
        <div className="mt-6 grid grid-cols-1 gap-6 tb:grid-cols-2 lp:grid-cols-3 [&>*]:h-full">
          {fireStarters.map((fs) => (
            <FireStarterCard
              key={fs.id}
              fireStarter={fs}
              onSelect={setSelectedFireStarter}
            />
          ))}
        </div>
      ) : forgeHref ? (
        <div className="mt-6 max-w-3xl rounded-[10px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-8 py-10">
          <p className={`${headlineLgClass} text-[1.5rem] text-[#1A1A1A]`}>
            Your first Fire Starter is waiting.
          </p>
          <p className={`${bodyClass} mt-4 text-[15px] text-[#4A4A4A]`}>
            Complete a puzzle in the Forge. The platform studies how you thought through it and
            crystallizes the combination of elements that worked. Your weapon comes with you into
            Ignite.
          </p>
          <Link href={forgeHref} className={`${primaryLinkClass} mt-6 inline-block`}>
            Enter the Forge →
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-[15px] italic text-[#999999]">{emptyMessage}</p>
      )}

      <FireStarterDetailModal
        fireStarter={selectedFireStarter}
        onClose={() => setSelectedFireStarter(null)}
      />
    </section>
  );
}
