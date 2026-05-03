import { createClient } from "@/lib/supabase/server";
import { Asset, Transaction } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, isInvestment } from "@/lib/currency";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: assets } = await supabase.from("assets").select("*");
  const { data: transactions } = await supabase.from("transactions").select("*");
  const assetList = (assets || []) as Asset[];
  const txList = (transactions || []) as Transaction[];

  const lastUpdate = assetList
    .map((a) => a.last_price_update)
    .filter(Boolean)
    .sort()
    .pop();

  const enriched = assetList.map((asset) => {
    const assetTxs = txList.filter((tx) => tx.asset_id === asset.id);
    const totalQty = assetTxs.reduce((sum, tx) => {
      if (tx.type === "buy" || tx.type === "deposit") return sum + tx.quantity;
      if (tx.type === "sell" || tx.type === "withdraw") return sum - tx.quantity;
      return sum + tx.quantity;
    }, 0);
    const marketValue = isInvestment(asset.category) && asset.current_price
      ? totalQty * asset.current_price
      : assetTxs.reduce((sum, tx) => {
          if (tx.type === "buy" || tx.type === "deposit") return sum + tx.amount;
          if (tx.type === "sell" || tx.type === "withdraw") return sum - tx.amount;
          return sum + tx.amount;
        }, 0);
    return { ...asset, marketValue };
  });

  const byCurrency = enriched.reduce((acc, a) => {
    acc[a.currency] = (acc[a.currency] || 0) + a.marketValue;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">总览</h1>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
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
      <div className="space-y-2">
        {Object.entries(byCurrency).map(([currency, total]) => (
          <div key={currency} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{currency} 资产</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(total, currency as Asset["currency"])}</p>
          </div>
        ))}
        {Object.keys(byCurrency).length === 0 && (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>暂无资产，前往「资产」页面添加</p>
          </div>
        )}
      </div>
      {enriched.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">资产明细</h2>
          {enriched.map((asset) => (
            <div key={asset.id} className="flex justify-between py-1">
              <div>
                <p className="text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-gray-400">{CATEGORY_LABELS[asset.category]}</p>
              </div>
              <p className="text-sm font-mono">{formatCurrency(asset.marketValue, asset.currency)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
