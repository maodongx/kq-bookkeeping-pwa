export type AssetCategory = "usStock" | "jpFund" | "cnFund" | "bankDeposit" | "cash" | "other";
export type Currency = "USD" | "JPY" | "CNY";
export type TransactionType = "buy" | "sell" | "deposit" | "withdraw" | "adjustment";
export type FundProvider = "mufg" | "rakuten" | "other";
export type AssetTag = "核心" | "成长个股" | "成长指数" | "收益" | "债券" | "黄金" | "主题" | "现金";
export type RiskLevel = "low" | "medium" | "high";

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  currency: Currency;
  symbol: string | null;
  fund_provider: FundProvider | null;
  tag: AssetTag | null;
  risk_level: RiskLevel | null;
  note: string | null;
  current_price: number | null;
  last_price_update: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  asset_id: string;
  type: TransactionType;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface AssetPriceSnapshot {
  id: string;
  asset_id: string;
  price: number;
  date: string;
}

export interface ExchangeRateSnapshot {
  id: string;
  base_currency: Currency;
  target_currency: Currency;
  rate: number;
  date: string;
}
