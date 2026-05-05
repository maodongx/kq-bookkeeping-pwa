import { Currency, AssetCategory, TransactionType, AssetTag, RiskLevel } from "./types";

export function formatCurrency(value: number, currency: Currency): string {
  const symbol = currency === "USD" ? "$" : "¥";
  const decimals = currency === "JPY" ? 0 : 2;
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${formatted}`;
}

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  usStock: "美股",
  jpFund: "日本基金",
  cnFund: "中国基金",
  mmf: "货币基金",
  managed: "委托理财",
  bankDeposit: "银行存款",
  cash: "现金",
  other: "其他",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "美元 $",
  JPY: "日元 ¥",
  CNY: "人民币 ¥",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  JPY: "¥",
  CNY: "¥",
};

export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  buy: "买入",
  sell: "卖出",
  deposit: "存入",
  withdraw: "取出",
  adjustment: "调整",
};

export function getAvailableTxTypes(category: AssetCategory): TransactionType[] {
  return isInvestment(category)
    ? ["buy", "sell"]
    : ["deposit", "withdraw", "adjustment"];
}

export function isInvestment(category: AssetCategory): boolean {
  return category === "usStock" || category === "jpFund" || category === "cnFund";
}

/**
 * True for categories that have a meaningful per-asset gain/loss figure.
 *
 * This is a strict superset of `isInvestment`:
 *   - isInvestment (usStock/jpFund/cnFund): buy-sell model, gainLoss =
 *     marketValue - totalCost (quantity × current_price less cost basis).
 *   - mmf / managed: balance-tracking model with no external price, gainLoss =
 *     balance - (deposits − withdraws). Users log the current NAV via
 *     `adjustment` transactions, which the capital-flows model already
 *     treats as market effect rather than new capital.
 *
 * bankDeposit / cash / other return false — if a user wants interest tracked
 * per-asset for a bank account, we can revisit, but today that gain only
 * shows up on the dashboard's cross-asset `累计盈亏`, not per-asset.
 */
export function hasPerAssetGainLoss(category: AssetCategory): boolean {
  return isInvestment(category) || category === "mmf" || category === "managed";
}

export const TAG_LABELS: AssetTag[] = [
  "个股", "宽基股票基金", "行业股票基金", "债券基金", "黄金", "现金",
];

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

/*
 * Color conventions
 *
 * Gain / loss follows Asian finance convention: red = gain, green = loss.
 * Use GAIN_TEXT / LOSS_TEXT (or the gainLossTextClass helper below) as
 * Tailwind text-color classes on dashboard and asset views.
 *
 * Risk level uses its own palette to avoid colliding with gain/loss.
 *   低风险 -> green  (safe)
 *   中风险 -> yellow (moderate)
 *   高风险 -> orange (warning, NOT red — red already means "gain")
 * This lives here because the dashboard pie chart and any future badge
 * or chip that needs a risk color should agree.
 */
export const GAIN_TEXT = "text-red-600";
export const LOSS_TEXT = "text-green-600";

export const RISK_COLORS: Record<string, string> = {
  低风险: "#10b981", // emerald-500
  中风险: "#f59e0b", // amber-500
  高风险: "#f97316", // orange-500 — reserved warning color, distinct from gain red
};

/** Pick the tailwind text-color class for a gain/loss value. */
export function gainLossTextClass(value: number): string {
  return value >= 0 ? GAIN_TEXT : LOSS_TEXT;
}
