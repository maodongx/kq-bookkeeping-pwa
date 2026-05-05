import {
  Asset,
  AssetPriceSnapshot,
  AssetTag,
  Currency,
  ExchangeRateSnapshot,
  RiskLevel,
  Transaction,
} from "./types";
import { RateMap, convertCurrency, totalNetWorth } from "./exchange-rates";
import { computeNetWorthTimeSeries } from "./chart-utils";
import { RISK_LABELS } from "./currency";

/**
 * The slice of an asset the dashboard actually needs — market value and
 * cost basis in the asset's native currency, plus the grouping keys for
 * the allocation pie charts. Everything else (id, name, symbol, category,
 * per-asset gainLoss/gainPct) is irrelevant to what the dashboard renders.
 */
export interface DashboardAsset {
  currency: Currency;
  marketValue: number;
  totalCost: number;
  tag: AssetTag | null;
  riskLevel: RiskLevel | null;
}

export interface AllocationSlice {
  name: string;
  value: number;
}

export interface DashboardStats {
  /** Total market value across all assets, in the selected currency. */
  netWorth: number;
  /** netWorth minus total cost basis, in the selected currency. */
  totalGain: number;
  /** Percent change vs. net worth one month ago, or null if no baseline. */
  monthChangePct: number | null;
  /**
   * Annualized return since the earliest historical snapshot. Null until
   * there are at least 30 days of history — below that the compounding
   * amplification makes the number meaningless.
   */
  annualizedPct: number | null;
  byTag: AllocationSlice[];
  byRisk: AllocationSlice[];
}

interface ComputeInput {
  assets: DashboardAsset[];
  rawAssets: Asset[];
  transactions: Transaction[];
  priceSnapshots: AssetPriceSnapshot[];
  rateSnapshots: ExchangeRateSnapshot[];
  rates: RateMap;
  currency: Currency;
}

/**
 * One-stop compute for every number the dashboard displays. Intentionally
 * a plain function (no React, no hooks) so it stays testable and the
 * DashboardClient component can focus on layout. Call once per render
 * from a useMemo keyed on the same inputs.
 */
export function computeDashboardStats(input: ComputeInput): DashboardStats {
  const { assets, rates, currency } = input;

  const netWorth = totalNetWorth(assets, currency, rates);
  const totalCost = assets.reduce(
    (sum, a) => sum + convertCurrency(a.totalCost, a.currency, currency, rates),
    0
  );
  const totalGain = netWorth - totalCost;

  const { monthChangePct, annualizedPct } = computeHistoricalStats(input, netWorth);

  const byTag = groupAllocation(assets, currency, rates, (a) => a.tag ?? "未分类");
  const byRisk = groupAllocation(assets, currency, rates, (a) =>
    a.riskLevel ? RISK_LABELS[a.riskLevel] : "未分类"
  );

  return { netWorth, totalGain, monthChangePct, annualizedPct, byTag, byRisk };
}

/**
 * Pull two numbers off the net-worth time series: the earliest point (for
 * annualized return) and the point from one month ago (for MoM change).
 * Anything shorter than 30 days of history suppresses the annualized
 * number so we don't show wildly amplified returns for brand-new users.
 */
function computeHistoricalStats(
  { rawAssets, transactions, priceSnapshots, rateSnapshots, currency }: ComputeInput,
  netWorth: number
): { monthChangePct: number | null; annualizedPct: number | null } {
  const allSeries = computeNetWorthTimeSeries(
    rawAssets,
    transactions,
    priceSnapshots,
    rateSnapshots,
    currency,
    "ALL"
  );
  const oneMonthSeries = computeNetWorthTimeSeries(
    rawAssets,
    transactions,
    priceSnapshots,
    rateSnapshots,
    currency,
    "1M"
  );

  const firstPoint = allSeries[0];
  const oneMonthAgoPoint = oneMonthSeries[0];

  const monthChangePct =
    oneMonthAgoPoint && oneMonthAgoPoint.netWorth > 0
      ? ((netWorth - oneMonthAgoPoint.netWorth) / oneMonthAgoPoint.netWorth) * 100
      : null;

  let annualizedPct: number | null = null;
  if (firstPoint && firstPoint.netWorth > 0) {
    const days = (Date.now() - new Date(firstPoint.date).getTime()) / 86400000;
    if (days >= 30) {
      annualizedPct = (Math.pow(netWorth / firstPoint.netWorth, 365 / days) - 1) * 100;
    }
  }

  return { monthChangePct, annualizedPct };
}

function groupAllocation(
  assets: DashboardAsset[],
  currency: Currency,
  rates: RateMap,
  label: (a: DashboardAsset) => string
): AllocationSlice[] {
  const totals: Record<string, number> = {};
  for (const a of assets) {
    const key = label(a);
    totals[key] =
      (totals[key] ?? 0) + convertCurrency(a.marketValue, a.currency, currency, rates);
  }
  return Object.entries(totals).map(([name, value]) => ({ name, value }));
}
