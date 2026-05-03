export type AssetCategory = "usStock" | "jpFund" | "bankDeposit" | "cash" | "other";
export type Currency = "USD" | "JPY" | "CNY";
export type TransactionType = "buy" | "sell" | "deposit" | "withdraw" | "adjustment";
export type FundProvider = "mufg" | "rakuten" | "other";

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  currency: Currency;
  symbol: string | null;
  fund_provider: FundProvider | null;
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
