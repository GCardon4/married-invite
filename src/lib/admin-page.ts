import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getSessionStore, sessionCookieName } from "@/lib/session";

/** `true` si la solicitud actual trae una sesión administrativa válida. Lee la cookie en el servidor. */
export async function hasAdminSession(): Promise<boolean> {
  // Validar la sesión consulta el reloj (vencimiento por inactividad). Con Cache Components, un
  // valor que cambia en cada solicitud debe calcularse en tiempo de solicitud, no al prerenderizar.
  await connection();
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
