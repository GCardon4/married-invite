import { STATUS_LABEL } from "@/lib/format";
import type { GuestStatus } from "@/types/guest";

const STYLES: Record<GuestStatus, string> = {
  confirmed: "border-ink/25 bg-ink/10 text-[#2f3a31]",
  pending: "border-tangerine/30 bg-peach/20 text-[#a03b1e]",
  declined: "border-primary/25 bg-primary/10 text-primary",
};

/** El texto, no solo el color, comunica el estado. */
export function StatusBadge({ status }: { status: GuestStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
