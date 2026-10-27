"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const INTERVAL_MS = 5000;

export interface Slide {
  src: string;
  alt: string;
}

/**
 * Presentación de fotos con fundido suave dentro del arco. Avanza sola cada 5 s, se detiene
 * si la pestaña está oculta, el usuario prefiere menos movimiento o toca un punto (entonces
 * deja de avanzar sola). Todas las fotos están en el HTML; solo la primera carga con prioridad.
 */
export function HeroSlider({ slides, sizes }: { slides: Slide[]; sizes: string }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const count = slides.length;

  useEffect(() => {
    if (!auto || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [auto, count]);

  return (
    <div className="absolute inset-0">
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={index === 0}
          sizes={sizes}
          aria-hidden={index !== active}
          className={`object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => {
                setAuto(false);
                setActive(index);
              }}
              aria-label={`Ver foto ${index + 1} de ${count}`}
              aria-current={index === active}
              className="flex size-5 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
            >
              <span
                className={`block size-2 rounded-full ring-1 ring-black/20 transition-colors ${
                  index === active ? "bg-white" : "bg-white/50"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
