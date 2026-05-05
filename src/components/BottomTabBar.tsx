"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, PenLine, PieChart, BarChart3 } from "lucide-react";
import { Tabs } from "@heroui/react";

const TABS = [
  { id: "/", label: "总览", icon: LayoutDashboard },
  { id: "/assets", label: "资产", icon: Wallet },
  { id: "/spending", label: "记账", icon: PenLine },
  { id: "/analytics", label: "分析", icon: PieChart },
  { id: "/charts", label: "图表", icon: BarChart3 },
] as const;

function resolveTab(pathname: string): string {
  if (pathname === "/") return "/";
  const match = TABS.find((t) => t.id !== "/" && pathname.startsWith(t.id));
  return match?.id ?? "/";
}

export function BottomTabBar() {
  const pathname = usePathname();
  const activeTab = resolveTab(pathname);

  return (
    <Tabs
      selectedKey={activeTab}
      className="fixed inset-x-0 bottom-0 z-50 bg-[#E6E0F8] pb-[env(safe-area-inset-bottom)]"
    >
      <Tabs.ListContainer className="border-t border-separator">
        <Tabs.List
          aria-label="Navigation"
          className="!bg-[#E6E0F8] flex justify-around *:flex-1 *:flex-col *:items-center *:gap-0.5 *:py-2 *:text-xs *:text-muted *:data-[selected=true]:text-accent"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <Tabs.Tab
                key={tab.id}
                id={tab.id}
                href={tab.id}
                render={(domProps) => (
                  <Link
                    {...(domProps as React.ComponentProps<typeof Link>)}
                    href={tab.id}
                  />
                )}
              >
                <Icon size={22} strokeWidth={isSelected ? 2.2 : 1.8} />
                <span>{tab.label}</span>
                <Tabs.Indicator className="hidden" />
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
