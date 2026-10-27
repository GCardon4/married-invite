"use client";

import { useEffect, useRef, useState } from "react";

const MUSIC_SRC = "/audio/music_romantic.mpeg";
const VOLUME = 0.5;
const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

const iconProps = { "aria-hidden": true, className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" } as const;

/**
 * Música de fondo en bucle al 50 % de volumen. Los navegadores bloquean el sonido automático,
 * así que se intenta al cargar y, si se bloquea, arranca con la primera interacción.
 * El botón fijo (abajo a la izquierda, sobre la barra de acciones) la silencia o la reanuda.
 */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mutedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;

    const removeUnlock = () => UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, unlock));
    function unlock() {
      if (mutedByUser.current) return;
      audio?.play().then(removeUnlock, () => {});
    }

    audio.play().catch(() => {
      UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, unlock));
    });
    return removeUnlock;
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      mutedByUser.current = false;
      audio.play().catch(() => {});
    } else {
      mutedByUser.current = true;
      audio.pause();
    }
  }

  return (
    <>
      <audio ref={audioRef} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
        <source src={MUSIC_SRC} type="audio/mpeg" />
      </audio>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!playing}
        aria-label={playing ? "Silenciar la música" : "Activar la música"}
        className="fixed bottom-20 left-3 z-40 inline-flex size-10 items-center justify-center rounded-full border border-primary/20 bg-card/90 text-primary shadow-md backdrop-blur-md transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {playing ? (
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
