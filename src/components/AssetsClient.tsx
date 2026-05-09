"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Key } from "@heroui/react";
import {
  Accordion,
  Card,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
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

/** Which per-asset return to display in the accordion rows. */
type ReturnMode = "allTime" | "month" | "day";

const RETURN_MODE_LABELS: Record<ReturnMode, string> = {
  allTime: "总收益",
  month: "近1月",
  day: "当日",
};

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
  /** All-time gain (or "总收益"): current gain/loss in display currency. Null for non-investments. */
  gainLossInDisplay: number | null;
  /** All-time gain as a percentage of cost. Null for non-investments. */
  gainPct: number | null;
  /** Value change over the last ~30 days in display currency. Null when not computable. */
  monthDeltaInDisplay: number | null;
  /** Month-over-month % change. Null when past value is 0 or missing. */
  monthPct: number | null;
  /** Value change since yesterday in display currency. Null when not computable. */
  dayDeltaInDisplay: number | null;
  /** Day-over-day % change. Null when past value is 0 or missing. */
  dayPct: number | null;
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

/**
 * "(42.1%)" of the total — one decimal, parens included. Returns an empty
 * string when the denominator is non-positive so we don't print "(NaN%)"
 * or "(Infinity%)" on the initial "no assets" render or if a weird
 * net-negative case ever shows up.
 */
function formatShare(value: number, total: number): string {
  if (total <= 0) return "";
  return `(${((value / total) * 100).toFixed(1)}%)`;
}

export function AssetsClient({
  groups,
  totalWealth,
  displayCurrency,
}: {
  groups: CategoryGroup[];
  /** Sum of all group totals in the display currency. */
  totalWealth: number;
  displayCurrency: Currency;
}) {
  const [returnMode, setReturnMode] = useState<ReturnMode>("allTime");

  // Per-row, pick out the value/pct pair that matches the selected mode.
  function selectedReturn(a: AssetRow): {
    value: number | null;
    pct: number | null;
  } {
    if (returnMode === "allTime") {
      return { value: a.gainLossInDisplay, pct: a.gainPct };
    }
    if (returnMode === "month") {
      return { value: a.monthDeltaInDisplay, pct: a.monthPct };
    }
    return { value: a.dayDeltaInDisplay, pct: a.dayPct };
  }

  return (
    <>
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
        <>
          {/* Return-mode toggle — centered, above the accordion.
              Switches the per-asset return display between 总收益 /
              近1月 / 当日 without re-fetching; the three values are
              precomputed on the server and attached to each row. */}
          <div className="flex justify-center">
            <ToggleButtonGroup
              aria-label="收益模式"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={new Set<Key>([returnMode])}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next) setReturnMode(next as ReturnMode);
              }}
            >
              {(["allTime", "month", "day"] as const).map((m, i) => (
                <ToggleButton key={m} id={m}>
                  {i > 0 && <ToggleButtonGroup.Separator />}
                  {RETURN_MODE_LABELS[m]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
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
                    <span className="ml-1 font-normal text-muted">
                      {formatShare(g.totalValue, totalWealth)}
                    </span>
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
                            {(() => {
                              const r = selectedReturn(a);
                              if (r.value == null || r.pct == null) return null;
                              return (
                                <p
                                  className={cn(
                                    "text-xs tabular-nums",
                                    gainLossTextClass(r.value)
                                  )}
                                >
                                  {formatSigned(r.value, displayCurrency)} (
                                  {r.pct >= 0 ? "+" : ""}
                                  {r.pct.toFixed(2)}%)
                                </p>
                              );
                            })()}
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
        </>
      )}
    </>
  );
}
