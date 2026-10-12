import { describe, expect, it, vi } from "vitest";

import { adminRequest, redirectIfUnauthorized } from "@/lib/admin-client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("adminRequest", () => {
  it("devuelve los datos en una respuesta correcta y envía JSON solo cuando hay cuerpo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ guest: { id: "g" } }, 201));

    const result = await adminRequest("/api/admin/invitados", { method: "POST", body: { name: "Ana" } }, fetchMock);

    expect(result).toEqual({ ok: true, data: { guest: { id: "g" } } });
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(init.body)).toEqual({ name: "Ana" });

    await adminRequest("/api/admin/invitados/x", { method: "DELETE" }, fetchMock);
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
  });

  it("usa el mensaje y los campos inválidos que envía el servidor", async () => {
    const issues = [{ path: "email", message: "Correo electrónico inválido." }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ error: { code: "VALIDATION", message: "Los datos enviados no son válidos.", issues } }, 400));

    expect(await adminRequest("/x", { method: "POST", body: {} }, fetchMock)).toEqual({
      ok: false,
      status: 400,
      message: "Los datos enviados no son válidos.",
      issues,
    });
  });

  it("401 → mensaje de sesión expirada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: { code: "UNAUTHORIZED", message: "x" } }, 401));
    const result = await adminRequest("/x", { method: "GET" }, fetchMock);

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(result.ok === false && result.message).toContain("sesión expiró");
  });

  it("sin conexión: aclara que el cambio no se guardó", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await adminRequest("/x", { method: "POST", body: {} }, fetchMock);

    expect(result).toMatchObject({ ok: false, status: 0 });
    expect(result.ok === false && result.message).toContain("no se guardó");
  });

  it("una respuesta de error que no es JSON → mensaje genérico", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    const result = await adminRequest("/x", { method: "GET" }, fetchMock);
    expect(result).toMatchObject({ ok: false, status: 502 });
  });
});

describe("redirectIfUnauthorized", () => {
  it("navega al inicio de sesión solo ante un 401", () => {
    const navigate = vi.fn();
    redirectIfUnauthorized({ ok: false, status: 401, message: "", issues: [] }, navigate);
    redirectIfUnauthorized({ ok: false, status: 400, message: "", issues: [] }, navigate);
    redirectIfUnauthorized({ ok: true, data: {} }, navigate);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/admin/login");
  });
});
