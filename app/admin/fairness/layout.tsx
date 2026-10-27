import AdminTabs from "@/components/admin-tabs";

const FAIRNESS_TABS = [
  { href: "/admin/fairness/sessions", label: "Suspicious ratings" },
  { href: "/admin/fairness/activity", label: "Rating activity" },
] as const;

export default function FairnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-t border-zinc-900">
        <AdminTabs tabs={FAIRNESS_TABS} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
