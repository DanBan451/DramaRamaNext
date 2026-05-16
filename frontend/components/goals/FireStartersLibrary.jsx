"use client";

import Image from "next/image";
import Link from "next/link";
import {
  bodyClass,
  eyebrowClass,
  headlineLgClass,
  primaryLinkClass,
  statLineClass,
} from "@/components/goals/goalWorkspaceStyles";

const ELEMENT_IMAGES = {
  earth: "/images/elements/earth.png",
  fire: "/images/elements/fire.png",
  air: "/images/elements/air.png",
  water: "/images/elements/water.png",
  change: "/images/elements/quintessential.png",
  synthesis: "/images/elements/quintessential.png",
};

function formatEarnedDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ElementIcons({ combination }) {
  const ids = (combination || []).filter(Boolean);
  if (!ids.length) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {ids.map((el) => {
        const src = ELEMENT_IMAGES[el] || ELEMENT_IMAGES.change;
        return (
          <div
            key={el}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-earth/30 bg-white shadow-sm"
          >
            <Image src={src} alt={el} fill className="object-cover object-center" sizes="40px" />
          </div>
        );
      })}
    </div>
  );
}

function FireStarterCard({ fireStarter }) {
  return (
    <article className="flex h-full min-w-[min(100%,18rem)] max-w-[22rem] shrink-0 flex-col rounded-sm border-2 border-earth bg-[#F0F9F0] p-5 shadow-[0_4px_24px_rgba(74,124,89,0.12)]">
      <ElementIcons combination={fireStarter.element_combination} />
      <h3 className={`${headlineLgClass} text-[1.375rem] leading-snug`}>
        {fireStarter.name}
      </h3>
      <p className={`${bodyClass} mt-3 line-clamp-3 flex-1 text-[0.9375rem] leading-[1.5]`}>
        {fireStarter.description}
      </p>
      <p className={`${statLineClass} mt-5`}>
        Earned {formatEarnedDate(fireStarter.created_at)}
      </p>
    </article>
  );
}

export default function FireStartersLibrary({ fireStarters, forgeHref, loading }) {
  const hasItems = Array.isArray(fireStarters) && fireStarters.length > 0;

  return (
    <section aria-labelledby="fire-starters-heading">
      <p className={eyebrowClass}>Your Fire Starters</p>
      <h2
        id="fire-starters-heading"
        className={`${headlineLgClass} mt-4 text-[clamp(1.75rem,2.5vw,2rem)]`}
      >
        Forged in this goal.
      </h2>

      {loading ? (
        <p className={`${bodyClass} mt-8 text-smoke`}>Loading…</p>
      ) : hasItems ? (
        <div className="mt-8 flex gap-5 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {fireStarters.map((fs) => (
            <FireStarterCard key={fs.id} fireStarter={fs} />
          ))}
        </div>
      ) : (
        <div className="mt-8 max-w-3xl rounded-sm border border-dashed border-mist bg-mist/40 px-8 py-10">
          <p className={`${headlineLgClass} text-[1.5rem]`}>
            Your first Fire Starter is waiting.
          </p>
          <p className={`${bodyClass} mt-4`}>
            Complete a puzzle in the Forge. The platform studies how you thought through it and
            crystallizes the combination of elements that worked. Your weapon comes with you into
            Ignite.
          </p>
          <Link href={forgeHref} className={`${primaryLinkClass} mt-6 inline-block`}>
            Enter the Forge →
          </Link>
        </div>
      )}
    </section>
  );
}
