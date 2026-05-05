"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Accordion, Card, Chip } from "@heroui/react";
import {
  AssetCategory,
  AssetTag,
  Currency,
  RiskLevel,
} from "@/lib/types";
import {
  CATEGORY_LABELS,
  RISK_LABELS,
  formatCurrency,
  gainLossTextClass,
} from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * A single row in the per-category list. marketValue and gainLoss are
 * already converted to the display currency by the server component, so
 * the client only formats strings. Keeping the conversion server-side
 * means we re-use fetchLatestRates and skip a second rate query.
 */
export interface AssetRow {
  id: string;
  name: string;
  /** Ticker / fund code. Shown as the primary chip (the "ID"). */
  symbol: string | null;
  tag: AssetTag | null;
  riskLevel: RiskLevel | null;
  /** Market value in the display currency. */
  valueInDisplay: number;
  /** Gain/loss in the display currency. Null for non-investments. */
  gainLossInDisplay: number | null;
  /** Gain/loss as a percentage of cost. Null for non-investments. */
  gainPct: number | null;
}

export interface CategoryGroup {
  category: AssetCategory;
  assets: AssetRow[];
  /** Sum of asset values in the display currency. */
  totalValue: number;
}

/**
 * Format a signed currency amount with an explicit "+" prefix for
 * positive values. formatCurrency() already prefixes "-" on negatives,
 * so we only prepend "+" for ≥0.
 */
function formatSigned(value: number, currency: Currency): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatCurrency(value, currency)}`;
}

export function AssetsClient({
  groups,
  displayCurrency,
}: {
  groups: CategoryGroup[];
  displayCurrency: Currency;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">资产</h1>
        <Link
          href="/assets/add"
          className="button button--primary button--md"
        >
          + 添加
        </Link>
      </div>

      {groups.length === 0 ? (
        <Card className="py-4 text-center">
          <Card.Content>
            <p className="mb-2 text-4xl">📦</p>
            <p className="text-muted">暂无资产</p>
            <Link
              href="/assets/add"
              className="mt-2 inline-block text-sm text-accent underline-offset-4 hover:underline"
            >
              添加第一笔资产 →
            </Link>
          </Card.Content>
        </Card>
      ) : (
        // Default Accordion (no `allowsMultipleExpanded`) collapses other
        // categories when one is opened — matches the user's "drill into
        // one category at a time" request.
        <Accordion variant="surface">
          {groups.map((g) => (
            <Accordion.Item key={g.category} id={g.category}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <div className="flex flex-1 items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {CATEGORY_LABELS[g.category]}
                    </span>
                    <span className="text-xs text-muted">
                      {g.assets.length}
                    </span>
                  </div>
                  <span className="mr-3 text-sm font-semibold tabular-nums">
                    {formatCurrency(g.totalValue, displayCurrency)}
                  </span>
                  <Accordion.Indicator>
                    <ChevronDown />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="p-0">
                  <ul className="divide-y divide-separator">
                    {g.assets.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/assets/${a.id}`}
                          className="flex items-start justify-between gap-3 p-3 transition-colors hover:bg-default"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-foreground">
                              {a.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              {a.symbol && (
                                <Chip variant="secondary" size="sm" className="!text-muted">
                                  {a.symbol}
                                </Chip>
                              )}
                              {a.tag && (
                                <Chip variant="tertiary" size="sm" className="!text-muted">
                                  {a.tag}
                                </Chip>
                              )}
                              {a.riskLevel && (
                                <Chip variant="tertiary" size="sm" className="!text-muted">
                                  {RISK_LABELS[a.riskLevel]}
                                </Chip>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm tabular-nums">
                              {formatCurrency(
                                a.valueInDisplay,
                                displayCurrency
                              )}
                            </p>
                            {a.gainLossInDisplay != null &&
                              a.gainPct != null && (
                                <p
                                  className={cn(
                                    "text-xs tabular-nums",
                                    gainLossTextClass(a.gainLossInDisplay)
                                  )}
                                >
                                  {formatSigned(
                                    a.gainLossInDisplay,
                                    displayCurrency
                                  )}{" "}
                                  ({a.gainPct >= 0 ? "+" : ""}
                                  {a.gainPct.toFixed(2)}%)
                                </p>
                              )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  );
}
