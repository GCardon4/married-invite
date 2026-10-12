import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { verifyAdminPassword } from "@/lib/auth";
import { ConfigurationError } from "@/lib/errors";
import {
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  SessionStore,
  sessionCookieName,
} from "@/lib/session";

const SECRET = "x".repeat(48);

// Valores de prueba generados al ejecutar: no hay contraseñas ni hashes escritos en el código,
// para que los escáneres de secretos no los confundan con credenciales reales.
const GOOD_PASSWORD = randomUUID();
const OTHER_SECRET = randomUUID();
const fakeHash = (...parts: string[]) => ["", ...parts].join("$");
const HOUR = 60 * 60 * 1000;

afterEach(() => vi.unstubAllEnvs());

describe("verifyAdminPassword", () => {
  let phc: string;

  beforeAll(async () => {
    phc = await hash(GOOD_PASSWORD);
  });

  it("usa Argon2id", () => {
    expect(phc).toMatch(/^\$argon2id\$/);
  });

  it("acepta la contraseña correcta y rechaza las demás (hash en formato PHC)", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", phc);
    expect(await verifyAdminPassword(GOOD_PASSWORD)).toBe(true);
    expect(await verifyAdminPassword("otra")).toBe(false);
    expect(await verifyAdminPassword(`${GOOD_PASSWORD} `)).toBe(false);
    expect(await verifyAdminPassword(GOOD_PASSWORD.toUpperCase())).toBe(false);
  });

  it("acepta el hash codificado en base64 (para archivos .env)", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", `base64:${Buffer.from(phc).toString("base64")}`);
    expect(await verifyAdminPassword(GOOD_PASSWORD)).toBe(true);
    expect(await verifyAdminPassword("otra")).toBe(false);
  });

  it.each([
    ["no está definido", ""],
    ["no es Argon2id", fakeHash("2b", "10", "x".repeat(53))],
    ["texto plano (la contraseña, no su hash)", "mi-contrasena"],
    ["quedó vacío por la expansión de $ en .env", "="],
    ["está truncado", fakeHash("argon2id", "v=19", "m=19456,t=2,p=1", "abc")],
  ])("falla cerrado con ConfigurationError si el hash %s", async (_name, value) => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", value);
    await expect(verifyAdminPassword("cualquiera")).rejects.toBeInstanceOf(ConfigurationError);
  });

  it("el error de configuración no contiene la contraseña ni el hash", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", fakeHash("argon2id", "v=19", "m=1,t=1,p=1", "truncado"));
    let error: Error | undefined;
    try {
      await verifyAdminPassword(OTHER_SECRET);
    } catch (caught) {
      error = caught as Error;
    }
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error?.message).not.toContain(OTHER_SECRET);
    expect(error?.message).not.toContain("truncado");
  });
});

describe("SessionStore", () => {
  const setup = () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    let now = 1_000_000;
    const store = new SessionStore(() => now);
    return { store, advance: (ms: number) => (now += ms) };
  };

  it("crea una sesión válida con cookie firmada y aleatoria", () => {
    const { store } = setup();
    const a = store.create();
    const b = store.create();

    expect(store.validate(a.cookieValue)).toBe(true);
    expect(a.cookieValue).not.toBe(b.cookieValue);
    expect(a.cookieValue).toMatch(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
    expect(a.maxAgeSeconds).toBe(8 * 3600);
  });

  it.each([[undefined], [null], [""], ["sin-punto"], [".firma"], ["id."], ["a.b"]])(
    "rechaza una cookie ausente o mal formada (%s)",
    (value) => {
      const { store } = setup();
      store.create();
      expect(store.validate(value as string | undefined)).toBe(false);
    },
  );

  it("rechaza una cookie con la firma alterada o con un id inventado", () => {
    const { store } = setup();
    const { cookieValue } = store.create();
    const [id, signature] = cookieValue.split(".");

    expect(store.validate(`${id}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`)).toBe(false);
    expect(store.validate(`${id}.${"A".repeat(43)}`)).toBe(false);
    expect(store.validate(`inventado.${signature}`)).toBe(false);
  });

  it("una cookie firmada con otro secreto no vale (y rotar el secreto cierra las sesiones)", () => {
    const { store } = setup();
    const { cookieValue } = store.create();

    vi.stubEnv("SESSION_SECRET", "y".repeat(48));
    expect(store.validate(cookieValue)).toBe(false);
  });

  it("sin SESSION_SECRET válido no hay sesiones y crear una falla con ConfigurationError", () => {
    vi.stubEnv("SESSION_SECRET", "corto");
    const store = new SessionStore();
    expect(() => store.create()).toThrow(ConfigurationError);
    expect(store.validate("a.b")).toBe(false);
  });

  it("cerrar sesión la invalida de verdad", () => {
    const { store } = setup();
    const { cookieValue } = store.create();

    store.destroy(cookieValue);
    expect(store.validate(cookieValue)).toBe(false);
    expect(store.size).toBe(0);
  });

  it("destruir con una cookie falsa no afecta a las sesiones reales", () => {
    const { store } = setup();
    const { cookieValue } = store.create();
    store.destroy("falsa.firma");
    expect(store.validate(cookieValue)).toBe(true);
  });

  it("vence por inactividad (2 h) pero la actividad la renueva", () => {
    const { store, advance } = setup();
    const { cookieValue } = store.create();

    advance(1.5 * HOUR);
    expect(store.validate(cookieValue)).toBe(true);
    advance(1.5 * HOUR);
    expect(store.validate(cookieValue)).toBe(true);
    advance(2 * HOUR);
    expect(store.validate(cookieValue)).toBe(false);
  });

  it("vence siempre a las 8 h aunque haya actividad constante", () => {
    const { store, advance } = setup();
    const { cookieValue } = store.create();

    for (let i = 0; i < 7; i++) {
      advance(HOUR);
      expect(store.validate(cookieValue)).toBe(true);
    }
    advance(HOUR);
    expect(store.validate(cookieValue)).toBe(false);
  });

  it("acota la cantidad de sesiones simultáneas descartando las más antiguas", () => {
    const { store } = setup();
    const first = store.create();
    for (let i = 0; i < 30; i++) store.create();

    expect(store.size).toBeLessThanOrEqual(20);
    expect(store.validate(first.cookieValue)).toBe(false);
  });
});

describe("cookie de sesión", () => {
  it("en desarrollo: HttpOnly y SameSite=Strict, sin Secure ni prefijo __Host-", () => {
    vi.stubEnv("NODE_ENV", "development");
    const cookie = serializeSessionCookie("valor", 100);

    expect(sessionCookieName()).toBe("admin_session");
    expect(cookie).toContain("admin_session=valor");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=100");
    expect(cookie).not.toContain("Secure");
  });

  it("en producción: Secure y prefijo __Host- (sin Domain)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const cookie = serializeSessionCookie("valor", 100);

    expect(sessionCookieName()).toBe("__Host-admin_session");
    expect(cookie).toMatch(/^__Host-admin_session=valor;/);
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("Domain");
  });

  it("la cookie de cierre usa los mismos atributos y caduca de inmediato", () => {
    vi.stubEnv("NODE_ENV", "production");
    const cleared = serializeClearedSessionCookie();

    expect(cleared).toMatch(/^__Host-admin_session=;/);
    expect(cleared).toContain("Max-Age=0");
    for (const attribute of ["Path=/", "HttpOnly", "SameSite=Strict", "Secure"]) {
      expect(cleared).toContain(attribute);
    }
  });

  it("lee la cookie correcta entre varias y devuelve undefined si no está", () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = (cookie?: string) => new Request("http://localhost/", { headers: cookie ? { cookie } : {} });

    expect(readSessionCookie(request("otra=1; admin_session=abc.def; z=2"))).toBe("abc.def");
    expect(readSessionCookie(request("otra=1"))).toBeUndefined();
    expect(readSessionCookie(request())).toBeUndefined();
    expect(readSessionCookie(request("xadmin_session=trampa"))).toBeUndefined();
  });
});
