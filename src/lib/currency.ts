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
  "核心", "成长个股", "成长指数", "收益", "债券", "黄金", "主题", "现金",
];

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};
