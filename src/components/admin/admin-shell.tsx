import { Suspense, type ReactNode } from "react";

import { AdminNav } from "./admin-nav";

/** Marco estático del panel. No lee la sesión: cada página comprueba el acceso por su cuenta. */
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <header className="mb-6 space-y-4">
        <Suspense fallback={<div className="h-10" aria-hidden="true" />}>
          <AdminNav />
        </Suspense>
        <h1 className="font-display text-3xl font-semibold text-plum-deep sm:text-4xl">{title}</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function PanelLoading() {
  return (
    <p role="status" aria-busy="true" className="py-10 text-center font-display text-lg text-plum">
      Cargando…
    </p>
  );
}
