import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as health } from "@/app/api/health/route";
import { getGuestService } from "@/lib/guest-service";
import nextConfig from "../next.config";

import { newDataFile, readRaw } from "./helpers";

const ROOT = path.resolve(__dirname, "..");
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

describe("GET /api/health", () => {
  let file: string;

  beforeEach(async () => {
    file = await newDataFile();
    vi.stubEnv("DATA_FILE_PATH", file);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("200 «ok» cuando los datos se pueden leer, sin devolver nada más", async () => {
    await getGuestService().createGuest({ name: "Ana Secreta", allowedGuests: 1 });
    const response = await health();
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(text).not.toContain("Secreta");
  });

  it("503 si el archivo está corrupto, y no lo modifica", async () => {
    await writeFile(file, "{ roto", "utf8");
    const response = await health();
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toEqual({ status: "error" });
    expect(text).not.toContain(file);
    expect(await readRaw(file)).toBe("{ roto");
  });

  it("503 si no hay DATA_FILE_PATH, sin revelar la causa", async () => {
    vi.stubEnv("DATA_FILE_PATH", "");
    const response = await health();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("DATA_FILE_PATH");
  });
});

describe("cabeceras de seguridad (next.config.ts)", () => {
  it("se aplican a todas las rutas e impiden incrustar el panel en otra página", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((rule) => rule.source === "/:path*");
    const headers = Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]));

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
  });

  it("genera el servidor mínimo (standalone) que usa el Dockerfile", () => {
    expect(nextConfig.output).toBe("standalone");
  });
});

describe("imagen de Docker", () => {
  it("el Dockerfile no incorpora secretos ni datos a la imagen", async () => {
    const dockerfile = await read("Dockerfile");
    const instructions = dockerfile
      .split("\n")
      .filter((line) => /^\s*(ARG|ENV)\b/.test(line) || /^\s+[A-Z_]+=/.test(line))
      .join("\n");

    expect(instructions).not.toMatch(/SESSION_SECRET|ADMIN_PASSWORD|PASSWORD|SECRET|TOKEN/i);
    expect(dockerfile).not.toMatch(/COPY[^\n]*\.env/);
    expect(dockerfile).not.toMatch(/COPY[^\n]*\bdata\b(?!-)/);
  });

  it("instala las dependencias de desarrollo para compilar y ejecuta sin ellas", async () => {
    const dockerfile = await read("Dockerfile");
    expect(dockerfile).toContain("npm ci --include=dev");
    expect(dockerfile).toMatch(/COPY --from=builder[^\n]*\.next\/standalone/);
    expect(dockerfile).toMatch(/COPY --from=builder[^\n]*\.next\/static/);
  });

  it("define el volumen de datos, el puerto, la sonda de salud y el arranque seguro", async () => {
    const dockerfile = await read("Dockerfile");
    expect(dockerfile).toContain("DATA_FILE_PATH=/app/data/guests.json");
    expect(dockerfile).toContain("HOSTNAME=0.0.0.0");
    expect(dockerfile).toContain("NODE_ENV=production");
    expect(dockerfile).toContain("EXPOSE 3000");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("/api/health");
    expect(dockerfile).toContain("docker-entrypoint.sh");
    expect(dockerfile).toContain("tini");
  });

  it(".dockerignore excluye secretos, datos reales, el repositorio y los artefactos", async () => {
    const lines = (await read(".dockerignore")).split("\n").map((l) => l.trim());

    for (const entry of [".env", ".env.*", "data/", ".git", "node_modules", ".next"]) {
      expect(lines, entry).toContain(entry);
    }
    // El build revisa los tipos de las pruebas, así que no se pueden excluir.
    expect(lines).not.toContain("tests");
    expect(lines).not.toContain("tests/");
    expect(lines).not.toContain("src");
  });

  it("los scripts de la imagen usan saltos de línea LF (con CRLF el shebang falla)", async () => {
    for (const file of ["docker-entrypoint.sh", "Dockerfile"]) {
      expect(await read(file), file).not.toContain("\r");
    }
    expect(await read(".gitattributes")).toMatch(/\*\.sh text eol=lf/);
  });

  it("el entrypoint falla pronto si falta configuración y no imprime valores secretos", async () => {
    const script = await read("docker-entrypoint.sh");
    expect(script).toContain("set -eu");
    for (const name of ["ADMIN_PASSWORD_HASH", "SESSION_SECRET", "DATA_FILE_PATH"]) {
      expect(script).toContain(name);
    }
    expect(script).not.toMatch(/echo[^\n]*\$\{?(ADMIN_PASSWORD_HASH|SESSION_SECRET|hash|secret)\b/);
    expect(script).toContain("exec su-exec node");
  });

  it(".env.example no contiene valores reales", async () => {
    const example = await read(".env.example");
    expect(example).toMatch(/^ADMIN_PASSWORD_HASH=$/m);
    expect(example).toMatch(/^SESSION_SECRET=$/m);
  });
});
