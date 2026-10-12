"use client";

import { useSyncExternalStore } from "react";

import { timeLeft } from "@/lib/countdown";

// Reloj compartido: un solo temporizador por pestaña, y `null` en el servidor para que el HTML
// inicial coincida con el del cliente (sin desajuste de hidratación).
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
const getSnapshot = () => Math.floor(Date.now() / 1000);
const getServerSnapshot = () => null;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const nowSeconds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const left = nowSeconds === null ? null : timeLeft(new Date(targetIso).getTime(), nowSeconds * 1000);

  if (left?.done) {
    return (
      <p className="font-display text-xl font-semibold text-plum" role="status">
        ¡Hoy celebramos! Gracias por ser parte de este día.
      </p>
    );
  }

  const cells: [string, string | null][] = [
    ["Días", left ? String(left.days) : null],
    ["Horas", left ? pad(left.hours) : null],
    ["Min", left ? pad(left.minutes) : null],
    ["Seg", left ? pad(left.seconds) : null],
  ];

  return (
    <div>
      {/* El lector de pantalla recibe un resumen estable; no se anuncia cada segundo. */}
      <p className="sr-only">{left ? `Faltan ${left.days} días para la boda.` : "Cuenta regresiva para la boda."}</p>
      <div className="grid grid-cols-4 gap-2 text-center" aria-hidden="true">
        {cells.map(([label, value], index) => (
          <div key={label} className="rounded-xl bg-card/90 px-1 py-2 shadow-sm ring-1 ring-plum/10">
            <span
              className={`block font-display text-2xl font-semibold tabular-nums leading-tight sm:text-3xl ${
                index === 3 ? "text-[#a53c00]" : "text-plum"
              }`}
            >
              {value ?? "––"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
