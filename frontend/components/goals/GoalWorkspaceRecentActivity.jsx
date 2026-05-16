"use client";

import Link from "next/link";
import {
  bodyClass,
  eyebrowClass,
  headlineLgClass,
  statLineClass,
} from "@/components/goals/goalWorkspaceStyles";

function formatWhen(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActivityRow({ href, title, mode, timestamp }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 border-b border-mist py-5 no-underline transition-colors last:border-b-0 hover:bg-mist/30 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0">
        <p className={`${bodyClass} text-[1.0625rem] group-hover:text-black`}>{title}</p>
        <p className={`${statLineClass} mt-1`}>{mode}</p>
      </div>
      <time className={`${statLineClass} shrink-0 sm:text-right`} dateTime={timestamp}>
        {formatWhen(timestamp)}
      </time>
    </Link>
  );
}

export default function GoalWorkspaceRecentActivity({ items }) {
  if (!items?.length) return null;

  return (
    <section className="mt-20" aria-labelledby="recent-activity-heading">
      <p className={eyebrowClass}>Recent</p>
      <h2
        id="recent-activity-heading"
        className={`${headlineLgClass} mt-4 text-[clamp(1.5rem,2.2vw,1.75rem)]`}
      >
        Where you&apos;ve been thinking.
      </h2>
      <div className="mt-6 max-w-4xl divide-y divide-mist rounded-sm border border-mist bg-white px-6">
        {items.map((item) => (
          <ActivityRow
            key={item.id}
            href={item.href}
            title={item.title}
            mode={item.mode}
            timestamp={item.timestamp}
          />
        ))}
      </div>
    </section>
  );
}
