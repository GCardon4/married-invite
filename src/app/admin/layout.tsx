import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Panel · Katheryn & Edwin",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
}
