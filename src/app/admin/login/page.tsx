import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PanelLoading } from "@/components/admin/admin-shell";
import { LoginForm } from "@/components/admin/login-form";
import { cardClass } from "@/components/admin/ui";
import { hasAdminSession } from "@/lib/admin-page";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className={cardClass}>
        <h1 className="font-display text-3xl font-semibold text-plum">Panel de invitaciones</h1>
        <p className="mt-1 mb-6 text-sm">Acceso exclusivo para los novios.</p>
        <Suspense fallback={<PanelLoading />}>
          <LoginGate />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginGate() {
  if (await hasAdminSession()) redirect("/admin/dashboard");
  return <LoginForm />;
}
