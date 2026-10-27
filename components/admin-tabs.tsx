"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AdminTabs({
  tabs,
  leading,
}: {
  tabs: readonly { href: string; label: string }[];
  leading?: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex shrink-0 flex-wrap items-stretch bg-black">
      {leading ? (
        <div className="flex shrink-0 items-center gap-3 border-r border-zinc-800 px-4 py-2">
          {leading}
        </div>
      ) : null}
      <nav className="flex min-w-0 flex-1 flex-wrap items-stretch justify-stretch">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 p-4 text-sm font-bold ${
                active
                  ? "text-green-200 border-b border-green-500"
                  : "text-zinc-300 hover:text-green-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
