/** Clases compartidas del panel (DESIGN.md: botones, campos y tarjetas). */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";

export const buttonPrimary = `rounded-[10px] bg-plum px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-fuchsia disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const buttonSecondary = `rounded-[10px] border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const buttonDanger = `rounded-[10px] bg-error px-5 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const inputClass = `w-full rounded-lg border-[1.5px] border-ink/25 bg-canvas px-3 py-2.5 text-ink placeholder:text-ink/50 focus:border-plum focus:shadow-[0_0_0_3px_rgba(163,48,91,0.15)] focus:outline-none`;

export const cardClass =
  "rounded-2xl border border-plum/10 bg-card p-5 shadow-[0_8px_24px_-4px_rgba(74,90,77,0.08)]";
