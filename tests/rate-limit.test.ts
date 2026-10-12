import { describe, expect, it } from "vitest";

import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  it("permite hasta el máximo y bloquea el resto dentro de la ventana", () => {
    let now = 1_000;
    const limiter = new RateLimiter(3, 60_000, () => now);

    expect([1, 2, 3].map(() => limiter.check("a").allowed)).toEqual([true, true, true]);
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);

    now += 30_000;
    expect(limiter.check("a").retryAfterSeconds).toBe(30);
  });

  it("reinicia el conteo al terminar la ventana", () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1_000, () => now);

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    now = 1_000;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("cuenta cada clave por separado", () => {
    const limiter = new RateLimiter(1, 60_000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("acota la memoria con muchas claves distintas", () => {
    const limiter = new RateLimiter(1, 60_000, () => 0, 100);
    for (let i = 0; i < 1_000; i++) limiter.check(`k${i}`);
    expect((limiter as unknown as { windows: Map<string, unknown> }).windows.size).toBeLessThanOrEqual(100);
  });
});
