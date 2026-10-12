import type { NextConfig } from "next";

/**
 * Cabeceras para todas las rutas. `frame-ancestors` y `X-Frame-Options` impiden incrustar el
 * panel en una página ajena (clickjacking). HSTS solo surte efecto sobre HTTPS.
 * No se define una CSP completa: Next.js inyecta scripts en línea y exigiría nonces por solicitud.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  /* config options here */
  // Imagen de Docker mínima: `.next/standalone/server.js` incluye solo lo que se usa.
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const mediaCache = [
      // Un día en el navegador; si se reemplaza una foto con el mismo nombre, se renueva al día siguiente.
      { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/images/:path*", headers: mediaCache },
      { source: "/videos/:path*", headers: mediaCache },
    ];
  },
};

export default nextConfig;
