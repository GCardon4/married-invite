"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { adminRequest } from "@/lib/admin-client";

import { focusRing } from "./ui";

const LINKS = [
  { href: "/admin/dashboard", label: "Resumen" },
  { href: "/admin/invitados", label: "Invitados" },
  { href: "/admin/invitados/nuevo", label: "Nueva invitación" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await adminRequest("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <nav aria-label="Panel de administración" className="flex flex-wrap items-center gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${focusRing} ${
              active ? "bg-primary text-white" : "hover:bg-primary/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={logout}
        disabled={leaving}
        className={`ml-auto rounded-full border-[1.5px] border-ink px-4 py-2 text-sm font-semibold hover:bg-ink/10 disabled:opacity-60 ${focusRing}`}
      >
        {leaving ? "Saliendo…" : "Cerrar sesión"}
      </button>
    </nav>
  );
}
