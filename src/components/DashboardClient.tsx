"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SortDescriptor } from "@heroui/react";
import { Currency, AssetCategory, AssetTag, RiskLevel } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, RISK_LABELS, isInvestment } from "@/lib/currency";
import { RateMap, convertCurrency, totalNetWorth } from "@/lib/exchange-rates";
import { refreshAllPrices } from "@/lib/prices";
import { cn } from "@/lib/utils";
import { Card, Table } from "@heroui/react";
import { ChevronUp } from "lucide-react";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AllocationPieChart } from "./AllocationPieChart";
import { RefreshPricesButton } from "./RefreshPricesButton";

function SortHeader({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center gap-1">
      {children}
      {!!direction && (
        <ChevronUp
          size={14}
          className={cn(
            "transition-transform duration-100",
            direction === "descending" && "rotate-180"
          )}
        />
      )}
    </span>
  );
}

export interface EnrichedAsset {
  id: string;
  name: string;
  category: AssetCategory;
  currency: Currency;
  symbol: string | null;
  tag: AssetTag | null;
  riskLevel: RiskLevel | null;
  marketValue: number;
  totalCost: number;
  gainLoss: number;
  gainPct: number;
}

export function DashboardClient({
  assets,
  rates,
  defaultCurrency,
  lastUpdate,
}: {
  assets: EnrichedAsset[];
  rates: RateMap;
  defaultCurrency: Currency;
  lastUpdate: string | null;
}) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const router = useRouter();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (hasRefreshed.current) return;
    hasRefreshed.current = true;
    refreshAllPrices().then(() => router.refresh());
  }, [router]);

  const netWorth = totalNetWorth(assets, currency, rates);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "value",
    direction: "descending",
  });

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      let cmp = 0;
      const col = sortDescriptor.column;
      if (col === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (col === "value") {
        const va = convertCurrency(a.marketValue, a.currency, currency, rates);
        const vb = convertCurrency(b.marketValue, b.currency, currency, rates);
        cmp = va - vb;
      } else if (col === "gainLoss") {
        const ga = isInvestment(a.category)
          ? convertCurrency(a.gainLoss, a.currency, currency, rates)
          : -Infinity;
        const gb = isInvestment(b.category)
          ? convertCurrency(b.gainLoss, b.currency, currency, rates)
          : -Infinity;
        cmp = ga - gb;
      }
      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [assets, sortDescriptor, currency, rates]);

  const byTag = Object.entries(
    assets.reduce(
      (acc, a) => {
        const label = a.tag || "未分类";
        acc[label] =
          (acc[label] || 0) +
          convertCurrency(a.marketValue, a.currency, currency, rates);
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  const byRisk = Object.entries(
    assets.reduce(
      (acc, a) => {
        const label = a.riskLevel ? RISK_LABELS[a.riskLevel] : "未分类";
        acc[label] =
          (acc[label] || 0) +
          convertCurrency(a.marketValue, a.currency, currency, rates);
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">总览</h1>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted">
              {new Date(lastUpdate).toLocaleString("zh-CN", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <RefreshPricesButton />
        </div>
      </div>

      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      {assets.length > 0 ? (
        <Card className="py-2 text-center">
          <Card.Content>
            <p className="text-sm text-muted">总资产</p>
            <p className="text-3xl font-bold tabular-nums">
              {formatCurrency(netWorth, currency)}
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card className="py-4 text-center">
          <Card.Content>
            <p className="mb-2 text-4xl">📭</p>
            <p className="text-muted">暂无资产，前往「资产」页面添加</p>
          </Card.Content>
        </Card>
      )}

      {assets.length > 0 && (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="资产明细"
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Column allowsSorting isRowHeader id="name">
                  {({ sortDirection }) => (
                    <SortHeader direction={sortDirection}>名称</SortHeader>
                  )}
                </Table.Column>
                <Table.Column id="tag">标签</Table.Column>
                <Table.Column id="risk">风险</Table.Column>
                <Table.Column allowsSorting id="value">
                  {({ sortDirection }) => (
                    <SortHeader direction={sortDirection}>市值</SortHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="gainLoss">
                  {({ sortDirection }) => (
                    <SortHeader direction={sortDirection}>盈亏</SortHeader>
                  )}
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {sortedAssets.map((a) => {
                  const value = convertCurrency(
                    a.marketValue,
                    a.currency,
                    currency,
                    rates
                  );
                  const inv = isInvestment(a.category);
                  const gain = inv
                    ? convertCurrency(a.gainLoss, a.currency, currency, rates)
                    : null;
                  return (
                    <Table.Row key={a.id} id={a.id}>
                      <Table.Cell>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted">
                          {CATEGORY_LABELS[a.category]}
                          {a.symbol ? ` · ${a.symbol}` : ""}
                        </p>
                      </Table.Cell>
                      <Table.Cell className="text-xs text-muted">
                        {a.tag || "—"}
                      </Table.Cell>
                      <Table.Cell className="text-xs text-muted">
                        {a.riskLevel ? RISK_LABELS[a.riskLevel] : "—"}
                      </Table.Cell>
                      <Table.Cell className="text-right tabular-nums text-sm">
                        {formatCurrency(value, currency)}
                      </Table.Cell>
                      <Table.Cell className="text-right tabular-nums text-sm">
                        {gain !== null ? (
                          <span
                            className={cn(
                              a.gainLoss >= 0
                                ? "text-red-600"
                                : "text-green-600"
                            )}
                          >
                            {a.gainLoss >= 0 ? "+" : ""}
                            {formatCurrency(gain, currency)}
                            <br />
                            <span className="text-xs">
                              ({a.gainPct >= 0 ? "+" : ""}
                              {a.gainPct.toFixed(2)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <AllocationPieChart data={byTag} title="按标签分配" />
      <AllocationPieChart data={byRisk} title="按风险等级分配" />
    </div>
  );
}
