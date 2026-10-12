/**
 * Ilustración floral decorativa en SVG, con la paleta de docs/DESIGN.md. Sin imágenes externas.
 * Todo es decorativo: está oculto a lectores de pantalla y no recibe clics.
 */
import type { CSSProperties } from "react";

const GOLD = "#e0b674";
const CREAM = "#fffdfa";
const SAGE = "#4a5a4d";
const SAGE_MID = "#6b816e";
const SAGE_LIGHT = "#97ab99";

type Palette = readonly [outer: string, middle: string, inner: string];

export const PALETTES = {
  plum: ["#a3305b", "#d3367b", "#fe9b7b"],
  fuchsia: ["#d3367b", "#e8699f", "#ffc6d3"],
  tangerine: ["#ff6a1e", "#fe9b7b", "#ffdbcd"],
  peach: ["#fe9b7b", "#ffc6d3", CREAM],
  blush: ["#ffc6d3", "#ffe3ea", CREAM],
} as const satisfies Record<string, Palette>;

type PaletteName = keyof typeof PALETTES;

/** Flor de capas de pétalos. Se dibuja centrada en (cx, cy); `r` es su radio aproximado. */
function Bloom({
  cx,
  cy,
  r,
  palette,
  petals = 9,
  rotate = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  palette: PaletteName;
  petals?: number;
  rotate?: number;
}) {
  const colors = PALETTES[palette];
  const step = 360 / petals;
  const layer = (key: string, cyOffset: number, rx: number, ry: number, color: string, shift: number) =>
    Array.from({ length: petals }, (_, i) => (
      <ellipse
        key={`${key}${i}`}
        cx={0}
        cy={cyOffset}
        rx={rx}
        ry={ry}
        transform={`rotate(${i * step + shift})`}
        fill={color}
        fillOpacity={0.95}
        stroke={CREAM}
        strokeOpacity={0.35}
        strokeWidth={1}
      />
    ));

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${r / 50})`}>
      {layer("a", -27, 15, 29, colors[0], 0)}
      {layer("b", -19, 11, 22, colors[1], step / 2)}
      {layer("c", -11, 7, 14, colors[2], 0)}
      <circle r={6.5} fill={GOLD} />
      <circle cx={-2} cy={-2} r={2.2} fill="#fff" fillOpacity={0.55} />
    </g>
  );
}

/** Hoja que apunta hacia arriba (−y) y se orienta con `angle` grados. */
function Leaf({
  x,
  y,
  len,
  angle,
  color = SAGE,
}: {
  x: number;
  y: number;
  len: number;
  angle: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${len / 40})`}>
      <path d="M0 0 C 9 -9 9 -28 0 -40 C -9 -28 -9 -9 0 0 Z" fill={color} />
      <path d="M0 -3 L0 -34" stroke={CREAM} strokeOpacity={0.4} strokeWidth={1.2} fill="none" />
    </g>
  );
}

function Branch({ d, width = 2.6 }: { d: string; width?: number }) {
  return <path d={d} fill="none" stroke={SAGE} strokeWidth={width} strokeLinecap="round" />;
}

const decorative = { "aria-hidden": true, focusable: false } as const;

/**
 * Ramo que nace en la esquina superior izquierda (0, 0) y se abre hacia el centro.
 * Se refleja con CSS para las demás esquinas.
 */
export function CornerBouquet({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 320 320" className={className} style={style} {...decorative}>
      <Branch d="M0 0 C 80 28 140 22 236 92" />
      <Branch d="M0 0 C 38 92 30 160 92 252" />
      <Branch d="M0 0 C 62 62 122 112 194 192" width={2.2} />

      {/* Follaje: primero, para que las flores queden encima */}
      <Leaf x={92} y={26} len={46} angle={62} color={SAGE_MID} />
      <Leaf x={150} y={34} len={44} angle={118} color={SAGE} />
      <Leaf x={198} y={62} len={40} angle={52} color={SAGE_LIGHT} />
      <Leaf x={30} y={118} len={46} angle={-58} color={SAGE} />
      <Leaf x={42} y={196} len={44} angle={-120} color={SAGE_MID} />
      <Leaf x={78} y={236} len={38} angle={-52} color={SAGE_LIGHT} />
      <Leaf x={120} y={120} len={40} angle={20} color={SAGE_MID} />
      <Leaf x={168} y={168} len={40} angle={-30} color={SAGE} />
      <Leaf x={252} y={104} len={30} angle={80} color={SAGE_LIGHT} />
      <Leaf x={20} y={258} len={30} angle={-170} color={SAGE_LIGHT} />

      <Bloom cx={150} cy={140} r={40} palette="peach" petals={10} rotate={12} />
      <Bloom cx={46} cy={178} r={37} palette="tangerine" petals={9} rotate={-8} />
      <Bloom cx={170} cy={46} r={34} palette="fuchsia" petals={9} rotate={20} />
      <Bloom cx={72} cy={72} r={54} palette="plum" petals={11} />
      <Bloom cx={238} cy={96} r={22} palette="plum" petals={8} rotate={30} />
      <Bloom cx={96} cy={246} r={25} palette="blush" petals={8} rotate={-14} />
      <Bloom cx={206} cy={190} r={19} palette="tangerine" petals={7} rotate={40} />
      <Bloom cx={14} cy={290} r={14} palette="fuchsia" petals={7} />
    </svg>
  );
}

/** Rama horizontal con flores y hojas, para separar secciones. */
export function FloralDivider({ className }: { className?: string }) {
  const side = (mirror: boolean) => (
    <g transform={mirror ? "translate(320 0) scale(-1 1)" : undefined}>
      <Branch d="M150 24 C 120 24 96 14 66 18 C 44 21 28 28 8 24" width={2} />
      <Leaf x={120} y={22} len={20} angle={-50} color={SAGE_MID} />
      <Leaf x={96} y={16} len={18} angle={40} color={SAGE} />
      <Leaf x={70} y={20} len={20} angle={-60} color={SAGE_LIGHT} />
      <Leaf x={44} y={24} len={16} angle={50} color={SAGE_MID} />
      <Bloom cx={104} cy={14} r={9} palette="fuchsia" petals={7} />
      <Bloom cx={58} cy={17} r={7} palette="tangerine" petals={7} />
      <Bloom cx={22} cy={25} r={5.5} palette="peach" petals={6} />
    </g>
  );

  return (
    <svg viewBox="0 0 320 44" className={className} {...decorative}>
      {side(false)}
      {side(true)}
      <Bloom cx={160} cy={22} r={17} palette="plum" petals={9} />
    </svg>
  );
}

/**
 * Guirnalda que rodea un arco (lado superior y laterales). Se coloca encima del marco del arco,
 * con la misma proporción (viewBox 400 × 500).
 */
export function ArchWreath({ className }: { className?: string }) {
  const center = { x: 200, y: 215 };
  const radius = 178;
  const order: PaletteName[] = ["plum", "tangerine", "fuchsia", "peach", "plum", "blush", "tangerine", "fuchsia"];

  const arc = Array.from({ length: 13 }, (_, i) => {
    const angle = Math.PI + (i * Math.PI) / 12;
    return {
      x: Number((center.x + radius * Math.cos(angle)).toFixed(1)),
      y: Number((center.y + radius * Math.sin(angle)).toFixed(1)),
      angleDeg: Number(((angle * 180) / Math.PI + 90).toFixed(1)),
      r: i % 3 === 0 ? 30 : i % 3 === 1 ? 22 : 17,
      palette: order[i % order.length],
    };
  });

  const sides = [0, 1, 2].flatMap((i) => [
    { x: 24 + (i % 2) * 8, y: 270 + i * 70, r: 20 - i * 2, palette: order[(i + 2) % order.length], dir: -1 },
    { x: 376 - (i % 2) * 8, y: 270 + i * 70, r: 20 - i * 2, palette: order[(i + 5) % order.length], dir: 1 },
  ]);

  return (
    <svg viewBox="0 0 400 500" className={`overflow-visible ${className ?? ""}`} {...decorative}>
      {/* Hojas bajo las flores */}
      {arc.map((p, i) => (
        <Leaf
          key={`l${i}`}
          x={p.x}
          y={p.y}
          len={34}
          angle={p.angleDeg + (i % 2 === 0 ? -38 : 38)}
          color={i % 3 === 0 ? SAGE : i % 3 === 1 ? SAGE_MID : SAGE_LIGHT}
        />
      ))}
      {sides.map((p, i) => (
        <Leaf key={`s${i}`} x={p.x} y={p.y} len={30} angle={p.dir * 55} color={i % 2 === 0 ? SAGE_MID : SAGE} />
      ))}

      {arc.map((p, i) => (
        <Bloom key={`b${i}`} cx={p.x} cy={p.y} r={p.r} palette={p.palette} petals={i % 2 === 0 ? 9 : 8} rotate={i * 23} />
      ))}
      {sides.map((p, i) => (
        <Bloom key={`sb${i}`} cx={p.x} cy={p.y} r={p.r} palette={p.palette} petals={8} rotate={i * 31} />
      ))}
    </svg>
  );
}

const PETALS: { left: string; size: number; dur: number; delay: number; drift: number; color: string }[] = [
  { left: "6%", size: 11, dur: 19, delay: 0, drift: 50, color: "#fe9b7b" },
  { left: "17%", size: 8, dur: 24, delay: 6, drift: -40, color: "#d3367b" },
  { left: "29%", size: 13, dur: 21, delay: 12, drift: 60, color: "#ffc6d3" },
  { left: "41%", size: 9, dur: 26, delay: 3, drift: -30, color: "#ff6a1e" },
  { left: "52%", size: 12, dur: 20, delay: 9, drift: 45, color: "#fe9b7b" },
  { left: "63%", size: 8, dur: 25, delay: 15, drift: -55, color: "#a3305b" },
  { left: "74%", size: 12, dur: 22, delay: 2, drift: 35, color: "#ffc6d3" },
  { left: "86%", size: 9, dur: 27, delay: 8, drift: -45, color: "#d3367b" },
  { left: "94%", size: 11, dur: 23, delay: 13, drift: 30, color: "#fe9b7b" },
];

/**
 * Fondo de toda la página: ramos en las cuatro esquinas, resplandor cálido y pétalos que caen
 * despacio. Va fijo detrás del contenido; con «reducir movimiento» se queda quieto.
 */
export function FloralBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(254,155,123,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(211,54,123,0.12),transparent_55%)]" />

      <div className="flora-sway absolute -left-8 -top-8 w-[min(60vw,360px)]" style={{ "--origin": "0 0" } as CSSProperties}>
        <CornerBouquet className="h-auto w-full" />
      </div>
      <div className="absolute -right-10 -top-6 w-[min(44vw,280px)] scale-x-[-1] opacity-90">
        <CornerBouquet className="h-auto w-full" />
      </div>
      <div className="absolute -bottom-10 -left-10 w-[min(46vw,300px)] scale-y-[-1] opacity-90">
        <CornerBouquet className="h-auto w-full" />
      </div>
      <div className="flora-sway absolute -bottom-8 -right-8 w-[min(62vw,380px)] rotate-180" style={{ "--origin": "100% 100%" } as CSSProperties}>
        <CornerBouquet className="h-auto w-full" />
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

/** Pequeña rama para las esquinas de las tarjetas. */
export function CardSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...decorative}>
      <Branch d="M0 0 C 30 12 56 10 88 40" width={2} />
      <Branch d="M0 0 C 12 32 10 58 40 90" width={2} />
      <Leaf x={34} y={14} len={22} angle={70} color={SAGE_MID} />
      <Leaf x={62} y={26} len={20} angle={50} color={SAGE_LIGHT} />
      <Leaf x={12} y={42} len={22} angle={-60} color={SAGE} />
      <Leaf x={20} y={72} len={20} angle={-120} color={SAGE_MID} />
      <Bloom cx={26} cy={26} r={24} palette="fuchsia" petals={9} />
      <Bloom cx={70} cy={50} r={13} palette="peach" petals={8} rotate={20} />
      <Bloom cx={48} cy={84} r={12} palette="tangerine" petals={7} rotate={-10} />
    </svg>
  );
}
