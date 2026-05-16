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

/** Gray tertiary button (completed / review) */
export const tertiaryCtaClass =
  "inline-flex items-center justify-center rounded-sm bg-mist px-5 py-2.5 text-sm font-semibold text-smoke transition-colors hover:bg-mist/80 no-underline";
