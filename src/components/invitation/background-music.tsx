"use client";

import { useEffect, useRef, useState } from "react";

const MUSIC_SRC = "/audio/music_romantic.mp3";
const VOLUME = 0.5;
const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

const iconProps = { "aria-hidden": true, className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" } as const;

/**
 * Música de fondo en bucle al 50 % de volumen, con autoplay y sonido activado: solo el invitado
 * la silencia, con el botón fijo (abajo a la izquierda, sobre la barra de acciones).
 * Los navegadores pueden bloquear el autoplay con sonido; entonces arranca en silencio (eso sí
 * lo permiten) y se activa el sonido con la primera interacción del invitado, salvo que ya la
 * hubiera silenciado él.
 */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mutedByUser = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;

    const removeUnlock = () => UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, unlock));
    function unlock() {
      if (!audio) return;
      if (mutedByUser.current) return removeUnlock();
      audio.muted = false;
      audio.play().then(removeUnlock, () => {});
    }

    audio.play().catch(() => {
      // Autoplay con sonido bloqueado: se reproduce sin sonido hasta la primera interacción.
      audio.muted = true;
      audio.play().catch(() => {});
      UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, unlock));
    });
    return removeUnlock;
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !mutedByUser.current;
    mutedByUser.current = next;
    audio.muted = next;
    setMuted(next);
    if (!next && audio.paused) audio.play().catch(() => {});
  }

  return (
    <>
      <audio ref={audioRef} autoPlay loop preload="auto">
        <source src={MUSIC_SRC} type="audio/mpeg" />
      </audio>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={muted}
        aria-label={muted ? "Activar la música" : "Silenciar la música"}
        className="fixed bottom-20 left-3 z-40 inline-flex size-10 items-center justify-center rounded-full border border-primary/20 bg-card/90 text-primary shadow-md backdrop-blur-md transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {!muted ? (
          <svg {...iconProps}>
            <path d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        ) : (
          <svg {...iconProps}>
            <path d="M11 5 6 9H3v6h3l5 4V5zM22 9l-6 6M16 9l6 6" />
          </svg>
        )}
      </button>
    </>
  );
}
