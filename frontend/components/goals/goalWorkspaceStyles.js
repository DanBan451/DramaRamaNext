/** Shared typography / CTA tokens for goal workspace pages (matches homepage). */

export const eyebrowClass =
  "font-mono text-[12px] font-medium uppercase leading-normal tracking-[0.15em] text-accent-blue lp:text-[13px]";

export const bodyClass =
  "font-sans text-[clamp(1rem,1.1vw,1.25rem)] font-medium leading-[1.55] text-[#2a2a2a]";

export const bodyMutedClass =
  "font-sans text-[clamp(0.9375rem,1vw,1.125rem)] font-medium italic leading-[1.5] text-[#5c5c62]";

export const headlineLgClass =
  "font-display font-normal italic leading-[1.06] tracking-[-0.02em] text-black";

/** Persistent goal title — fixed breakpoint sizes (no vw) so scrollbar width changes never reflow the headline */
export const goalTitleClass =
  "font-display font-normal italic leading-[1.05] tracking-[-0.02em] text-black text-[2.75rem] tb:text-[3.25rem] lp:text-[4.5rem]";

export const sectionHeadlineClass =
  "font-display font-normal italic leading-[1.08] tracking-[-0.02em] text-black text-[clamp(1.5rem,2.2vw,1.875rem)]";

export const statLineClass =
  "font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-smoke";

/** Purple filled — primary action */
export const primaryCtaClass =
  "inline-flex items-center justify-center rounded-sm bg-change px-8 py-4 text-base font-bold text-white shadow-sm outline-none ring-1 ring-black/5 transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/90 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0";

/** Purple text link — primary action on cards */
export const primaryLinkClass =
  "font-sans text-sm font-semibold text-change no-underline transition-colors hover:underline";

/** Dark red text link — secondary action */
export const secondaryLinkClass =
  "font-sans text-sm font-semibold text-primary no-underline transition-colors hover:underline";

/** Purple outlined tertiary — review / completed (same footprint as primaryCtaClass) */
export const tertiaryCtaClass =
  "inline-flex w-full items-center justify-center rounded-sm border border-change bg-white px-8 py-4 text-base font-bold leading-none text-change shadow-sm outline-none ring-1 ring-black/5 no-underline transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/5 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2";

/** Forge puzzle grid — completed card accent (neutral, not green) */
export const FORGE_COMPLETED = {
  pillBg: "#F0F0F0",
  pillText: "#4A4A4A",
  stripe: "#888888",
};

export const forgeCompletedPillClass =
  "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-[#E0E0E0] bg-[#F0F0F0] text-[#4A4A4A]";

/** Forge puzzle grid — compact purple CTA (~132px wide, 14px type) */
export const forgePuzzlePrimaryCtaClass =
  "inline-flex w-[8.25rem] max-w-[8.75rem] items-center justify-center self-start rounded-sm bg-change px-4 py-2 text-sm font-medium text-white shadow-sm outline-none ring-1 ring-black/5 transition-[background-color,box-shadow] duration-200 hover:bg-[#8749d4] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 no-underline";
