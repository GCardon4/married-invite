"use client";

export default function InvitationError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 text-center">
      <div
        role="alert"
        className="rounded-3xl border border-plum/10 bg-card p-8 shadow-[0_8px_24px_-4px_rgba(74,90,77,0.08)]"
      >
        <h1 className="font-display text-3xl font-semibold text-plum">No pudimos cargar tu invitación</h1>
        <p className="mt-4 leading-7">
          Tuvimos un problema temporal. Tu enlace sigue siendo válido: inténtalo de nuevo en unos minutos.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-[10px] bg-plum px-6 py-3 font-semibold text-white transition-colors hover:bg-fuchsia focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
