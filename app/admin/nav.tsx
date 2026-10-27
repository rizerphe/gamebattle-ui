"use client";

import { usePathname } from "next/navigation";
import AdminTabs from "@/components/admin-tabs";

const GLOBAL_ADMIN_TABS = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/fairness", label: "Fairness" },
  { href: "/admin/submissions", label: "Submissions" },
] as const;

export default function AdminNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/replay")) return null;
  if (/^\/admin\/students\/[^/]+/.test(pathname)) return null;
  return <AdminTabs tabs={GLOBAL_ADMIN_TABS} />;
}
