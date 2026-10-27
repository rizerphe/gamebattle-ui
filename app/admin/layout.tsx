import AdminNav from "./nav";
import { AdminShell } from "./admin-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-m-4 flex h-[calc(100dvh-6.75rem)] flex-col self-stretch overflow-hidden bg-black">
      <AdminNav />
      <AdminShell>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </AdminShell>
    </div>
  );
}
