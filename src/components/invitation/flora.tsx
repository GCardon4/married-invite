/**
 * Decoración floral de la invitación, con las imágenes de public/images/flowers/ (versiones web
 * generadas por `npm run prepare-flowers`). Todo es decorativo: alt vacío, oculto a lectores de
 * pantalla y sin recibir clics.
 */
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

const BASE = "/images/flowers/web";

/** Tamaños reales de los archivos .webp (el navegador reserva el espacio antes de cargarlos). */
export const FLOWERS = {
  arch: { src: `${BASE}/arch.webp`, width: 2000, height: 1567 },
  one: { src: `${BASE}/flower-01.webp`, width: 720, height: 838 },
  two: { src: `${BASE}/flower-02.webp`, width: 720, height: 912 },
  three: { src: `${BASE}/flower-03.webp`, width: 720, height: 894 },
  four: { src: `${BASE}/flower-04.webp`, width: 632, height: 716 },
} as const;

export type FlowerName = Exclude<keyof typeof FLOWERS, "arch">;

/** Una flor suelta. El tamaño y la posición los decide quien la usa con `className`. */
export function Flower({
  name,
  className = "",
  sizes = "(min-width: 640px) 300px, 46vw",
  style,
}: {
  name: FlowerName;
  className?: string;
  sizes?: string;
  style?: CSSProperties;
}) {
  const { src, width, height } = FLOWERS[name];
  return (
    <Image
      src={src}
      width={width}
      height={height}
      sizes={sizes}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pointer-events-none h-auto select-none ${className}`}
      style={style}
    />
  );
}

/**
 * Arco floral principal, en la parte superior. El centro está abierto: ahí va `children`
 * (la foto de los novios y, en pantallas grandes, sus nombres). Las proporciones salen de la imagen: el hueco mide
 * ~43 % del ancho y está algo a la izquierda del centro, porque el ramo derecho es más grande.
 */
export function FloralArch({ children }: { children: ReactNode }) {
  const { src, width, height } = FLOWERS.arch;
  return (
    <div
      // A todo el ancho: la imagen original está recortada en sus bordes, y así las flores sangran por los
      // lados de la pantalla en vez de cortarse en seco. Por encima de 1600 px se difuminan los extremos.
      className="relative mx-auto w-full max-w-[1600px] min-[1600px]:[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={src}
        width={width}
        height={height}
        priority
        sizes="(min-width: 1600px) 1600px, 100vw"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
      />
      <div
        className="absolute flex flex-col items-center justify-center gap-[3%]"
        style={{ left: "26.5%", width: "43%", top: "21%", bottom: "9%" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Separador de secciones: dos hilos y un pequeño ramo en el centro. */
export function FloralDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 sm:w-24" />
      <Flower name="four" sizes="72px" className="w-14 sm:w-[4.5rem]" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 sm:w-24" />
    </div>
  );
}

const PETALS: { left: string; size: number; dur: number; delay: number; drift: number; color: string }[] = [
  { left: "6%", size: 11, dur: 19, delay: 0, drift: 50, color: "#f7b3cc" },
  { left: "17%", size: 8, dur: 24, delay: 6, drift: -40, color: "#d3367b" },
  { left: "29%", size: 13, dur: 21, delay: 12, drift: 60, color: "#fcd3e0" },
  { left: "41%", size: 9, dur: 26, delay: 3, drift: -30, color: "#e86a9f" },
  { left: "52%", size: 12, dur: 20, delay: 9, drift: 45, color: "#f7b3cc" },
  { left: "63%", size: 8, dur: 25, delay: 15, drift: -55, color: "#b02a68" },
  { left: "74%", size: 12, dur: 22, delay: 2, drift: 35, color: "#fcd3e0" },
  { left: "86%", size: 9, dur: 27, delay: 8, drift: -45, color: "#d3367b" },
  { left: "94%", size: 11, dur: 23, delay: 13, drift: 30, color: "#f7b3cc" },
];

/**
 * Fondo de toda la página: resplandor rosado, un ramo en cada esquina inferior y pétalos que caen
 * despacio. Va fijo detrás del contenido; con «reducir movimiento» se queda quieto.
 */
export function FloralBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,54,123,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(247,179,204,0.30),transparent_60%)]" />

      <div className="flora-sway absolute -bottom-6 -left-8 w-[min(46vw,300px)]" style={{ "--origin": "0 100%" } as CSSProperties}>
        <Flower name="one" className="w-full" />
      </div>
      <div className="flora-sway absolute -bottom-6 -right-8 w-[min(44vw,290px)]" style={{ "--origin": "100% 100%" } as CSSProperties}>
        <Flower name="three" className="w-full" />
      </div>

      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              "--dur": `${p.dur}s`,
              "--delay": `-${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
