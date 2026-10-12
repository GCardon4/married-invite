"use client";

import { buttonPrimary, cardClass } from "@/components/admin/ui";

export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <div role="alert" className={`${cardClass} text-center`}>
        <h1 className="font-display text-3xl font-semibold text-primary">No pudimos cargar el panel</h1>
        <p className="mt-3 leading-7">
          Hubo un problema al leer los datos o con la configuración del servidor. No se modificó ningún dato.
          Revisa los registros del servidor para ver el motivo.
        </p>
        <button type="button" onClick={() => retry()} className={`${buttonPrimary} mt-5`}>
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
