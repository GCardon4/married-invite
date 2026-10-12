import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionStore, sessionCookieName } from "@/lib/session";

/** `true` si la solicitud actual trae una sesión administrativa válida. Lee la cookie en el servidor. */
export async function hasAdminSession(): Promise<boolean> {
  const value = (await cookies()).get(sessionCookieName())?.value;
  return getSessionStore().validate(value);
}

/**
 * Debe llamarse al inicio de CADA página administrativa que muestre datos: los layouts no se
 * vuelven a ejecutar al navegar, así que no sirven como único control de acceso.
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await hasAdminSession())) redirect("/admin/login");
}
