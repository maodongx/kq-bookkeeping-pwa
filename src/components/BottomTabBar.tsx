"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/assets", label: "资产", icon: Wallet },
  { href: "/charts", label: "分析", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-separator bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center px-3 py-2 text-xs transition-colors",
              active ? "text-accent" : "text-muted"
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span className="mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
