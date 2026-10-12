export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** `true` si el momento ya pasó. */
  done: boolean;
}

/** Tiempo restante entre `nowMs` y `targetMs` (ambos en milisegundos desde la época). */
export function timeLeft(targetMs: number, nowMs: number): TimeLeft {
  const diff = targetMs - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}
