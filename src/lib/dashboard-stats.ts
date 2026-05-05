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
import { capitalFlowsBetween } from "./capital-flows";
import { RISK_LABELS } from "./currency";

/**
 * The slice of an asset the dashboard actually needs — market value in
 * the asset's native currency, plus the grouping keys for the allocation
 * pie charts. Per-asset cost basis is intentionally *not* here: total
 * gain on the dashboard is now derived from cross-asset capital flows
 * (see computeDashboardStats below), not from summing per-asset costs.
 */
export interface DashboardAsset {
  currency: Currency;
  marketValue: number;
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
  /**
   * netWorth minus all-time net capital flows, in the selected currency.
   * This is real gain: what the market did for you, excluding the money
   * you put in or took out. A pure "deposit your salary into a tracked
   * bank account" day produces zero here, not a spurious +salary.
   */
  totalGain: number;
  /**
   * Money-weighted return over the last ~30 days, as a percentage.
   * Null until there's at least one snapshot in that window.
   * Uses the Modified-Dietz simplification: new capital is assumed to
   * have landed at the midpoint of the window, so depositing today is
   * not unfairly counted against the period's starting balance.
   */
  monthChangePct: number | null;
  /**
   * Annualized money-weighted return since the earliest snapshot.
   * Null until there are at least 30 days of history — below that the
   * compounding factor (365/days) amplifies noise into nonsense.
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
  const { assets, rawAssets, transactions, rates, currency } = input;

  const netWorth = totalNetWorth(assets, currency, rates);

  // All-time net capital you've committed to tracked wealth.
  // totalGain is whatever the market added on top of that.
  const capitalInAllTime = capitalFlowsBetween(
    transactions,
    rawAssets,
    currency,
    rates
  );
  const totalGain = netWorth - capitalInAllTime;

  const { monthChangePct, annualizedPct } = computeHistoricalStats(input, netWorth);

  const byTag = groupAllocation(assets, currency, rates, (a) => a.tag ?? "未分类");
  const byRisk = groupAllocation(assets, currency, rates, (a) =>
    a.riskLevel ? RISK_LABELS[a.riskLevel] : "未分类"
  );

  return { netWorth, totalGain, monthChangePct, annualizedPct, byTag, byRisk };
}

/**
 * Modified-Dietz money-weighted returns for two windows: the last month
 * (for 近1月) and since the earliest snapshot (for 年化).
 *
 * The formula for each window:
 *     periodReturn = (EMV − BMV − NetCF) / (BMV + NetCF / 2)
 * where
 *     EMV   = ending market value (today's netWorth)
 *     BMV   = beginning market value (netWorth at the window's start)
 *     NetCF = net capital flows during the window
 *
 * The "+ NetCF / 2" in the denominator is the uniform-timing
 * simplification — it assumes new capital landed halfway through the
 * window on average. Without it, depositing your salary on day 1 of the
 * window would crush the percentage; depositing on the last day would
 * barely move it. The midpoint assumption evens that out.
 */
function computeHistoricalStats(
  { rawAssets, transactions, priceSnapshots, rateSnapshots, rates, currency }: ComputeInput,
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

  const monthChangePct = modifiedDietzPct({
    emv: netWorth,
    startPoint: oneMonthSeries[0],
    transactions,
    rawAssets,
    currency,
    rates,
  });

  let annualizedPct: number | null = null;
  const firstPoint = allSeries[0];
  if (firstPoint) {
    const days = (Date.now() - new Date(firstPoint.date).getTime()) / 86400000;
    // <30 days of history is too short to annualize sensibly; the
    // (365/days) exponent would amplify normal daily noise into huge
    // percentages. Leave it null and let the UI show "—".
    if (days >= 30) {
      const periodReturn = modifiedDietzReturn({
        emv: netWorth,
        startPoint: firstPoint,
        transactions,
        rawAssets,
        currency,
        rates,
      });
      if (periodReturn != null && 1 + periodReturn > 0) {
        annualizedPct = (Math.pow(1 + periodReturn, 365 / days) - 1) * 100;
      }
    }
  }

  return { monthChangePct, annualizedPct };
}

interface DietzInput {
  emv: number;
  startPoint: { date: string; netWorth: number } | undefined;
  transactions: Transaction[];
  rawAssets: Asset[];
  currency: Currency;
  rates: RateMap;
}

/** Modified-Dietz period return as a decimal (e.g. 0.032 = +3.2%). */
function modifiedDietzReturn({
  emv,
  startPoint,
  transactions,
  rawAssets,
  currency,
  rates,
}: DietzInput): number | null {
  if (!startPoint || startPoint.netWorth <= 0) return null;
  const netCF = capitalFlowsBetween(
    transactions,
    rawAssets,
    currency,
    rates,
    startPoint.date
  );
  const denom = startPoint.netWorth + netCF / 2;
  // Denominator can go non-positive if the user withdrew far more than
  // their starting balance — bail rather than return a misleading %.
  if (denom <= 0) return null;
  return (emv - startPoint.netWorth - netCF) / denom;
}

/** Same as modifiedDietzReturn but returns a percentage (×100). */
function modifiedDietzPct(input: DietzInput): number | null {
  const r = modifiedDietzReturn(input);
  return r == null ? null : r * 100;
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
