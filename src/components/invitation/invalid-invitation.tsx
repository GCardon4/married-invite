import { PUBLIC_MESSAGES } from "@/lib/public-messages";

import { FloralBackdrop, FloralDivider } from "./flora";

export function InvalidInvitation() {
  return (
    <div className="relative isolate flex min-h-screen flex-1 flex-col overflow-x-clip">
      <FloralBackdrop />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 text-center">
        <div className="rounded-3xl border border-primary/15 bg-card/95 p-8 shadow-[0_12px_32px_-6px_rgba(74,90,77,0.12)]">
          <FloralDivider className="mb-3" />
          <h1 className="font-display text-3xl font-semibold text-primary">Enlace no disponible</h1>
          <p className="mt-4 leading-7">{PUBLIC_MESSAGES.invalidLink}</p>
        </div>
      </main>
    </div>
  );
}

export function InvitationSkeleton() {
  return (
    <div className="relative isolate flex min-h-screen flex-1 flex-col overflow-x-clip" aria-busy="true">
      <FloralBackdrop />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <p role="status" className="font-display text-xl text-primary">
          Preparando tu invitación…
        </p>
      </main>
    </div>
  );
}
