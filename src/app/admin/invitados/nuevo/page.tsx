import { Suspense } from "react";

import { AdminShell, PanelLoading } from "@/components/admin/admin-shell";
import { GuestForm } from "@/components/admin/guest-form";
import { requireAdminPage } from "@/lib/admin-page";

export default function NewGuestPage() {
  return (
    <AdminShell title="Nueva invitación">
      <Suspense fallback={<PanelLoading />}>
        <NewGuestContent />
      </Suspense>
    </AdminShell>
  );
}

async function NewGuestContent() {
  await requireAdminPage();
  return <GuestForm />;
}
