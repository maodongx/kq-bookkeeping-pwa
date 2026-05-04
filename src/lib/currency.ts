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
  if (category === "usStock" || category === "jpFund" || category === "cnFund") return ["buy", "sell"];
  return ["deposit", "withdraw", "adjustment"];
}

export function isInvestment(category: AssetCategory): boolean {
  return category === "usStock" || category === "jpFund" || category === "cnFund";
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
 *   - Tailwind: use GAIN_TEXT / LOSS_TEXT classes below.
 *   - Chart fills (SVG): use GAIN_FILL / LOSS_FILL hex values.
 *
 * Risk level uses its own palette to avoid colliding with gain/loss.
 *   低风险 -> green  (safe)
 *   中风险 -> yellow (moderate)
 *   高风险 -> orange (warning, NOT red — red already means "gain")
 * This lives here because both the dashboard pie chart and any future
 * badge/chip that needs a risk color should agree.
 */
export const GAIN_TEXT = "text-red-600";
export const LOSS_TEXT = "text-green-600";
export const GAIN_FILL = "#dc2626"; // red-600
export const LOSS_FILL = "#16a34a"; // green-600

export const RISK_COLORS: Record<string, string> = {
  低风险: "#10b981", // emerald-500
  中风险: "#f59e0b", // amber-500
  高风险: "#f97316", // orange-500 — reserved warning color, distinct from gain red
};

/** Pick the tailwind text-color class for a gain/loss value. */
export function gainLossTextClass(value: number): string {
  return value >= 0 ? GAIN_TEXT : LOSS_TEXT;
}

/** Pick the SVG fill hex for a gain/loss value. */
export function gainLossFill(value: number): string {
  return value >= 0 ? GAIN_FILL : LOSS_FILL;
}
