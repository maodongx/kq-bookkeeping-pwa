import { createClient } from "@/lib/supabase/server";
import { Asset, Transaction } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, TX_TYPE_LABELS, isInvestment } from "@/lib/currency";
import Link from "next/link";
import { DeleteAssetButton } from "@/components/DeleteAssetButton";
import { AddTransactionForm } from "@/components/AddTransactionForm";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: asset } = await supabase.from("assets").select("*").eq("id", id).single();
  if (!asset) return <div className="p-4">资产不存在</div>;

  const { data: transactions } = await supabase.from("transactions").select("*").eq("asset_id", id).order("date", { ascending: false });
  const txList = (transactions || []) as Transaction[];
  const a = asset as Asset;
  const inv = isInvestment(a.category);

  const totalQty = txList.reduce((sum, tx) => {
    if (tx.type === "buy" || tx.type === "deposit") return sum + tx.quantity;
    if (tx.type === "sell" || tx.type === "withdraw") return sum - tx.quantity;
    return sum + tx.quantity;
  }, 0);

  const totalCost = txList.reduce((sum, tx) => {
    if (tx.type === "buy") return sum + tx.amount;
    if (tx.type === "sell") return sum - tx.amount;
    return sum;
  }, 0);

  const balance = txList.reduce((sum, tx) => {
    if (tx.type === "buy" || tx.type === "deposit") return sum + tx.amount;
    if (tx.type === "sell" || tx.type === "withdraw") return sum - tx.amount;
    return sum + tx.amount;
  }, 0);

  const marketValue = inv && a.current_price ? totalQty * a.current_price : balance;
  const gainLoss = inv ? marketValue - totalCost : 0;
  const gainPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/assets" className="text-blue-600 text-sm">← 返回</Link>
        <DeleteAssetButton assetId={a.id} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-bold">{a.name}</h1>
        <p className="text-sm text-gray-500">{CATEGORY_LABELS[a.category]} · {a.currency}{a.symbol ? ` · ${a.symbol}` : ""}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2 text-sm">
        {inv && <Row label="持有数量" value={totalQty.toFixed(4)} />}
        {inv && <Row label="平均成本" value={totalQty > 0 ? formatCurrency(totalCost / totalQty, a.currency) : "-"} />}
        {inv && a.current_price && <Row label="当前价格" value={formatCurrency(a.current_price, a.currency)} />}
        <Row label={inv ? "市值" : "余额"} value={formatCurrency(marketValue, a.currency)} />
        {inv && <Row label="盈亏" value={`${formatCurrency(gainLoss, a.currency)} (${gainLoss >= 0 ? "+" : ""}${gainPct.toFixed(2)}%)`} color={gainLoss >= 0 ? "text-red-600" : "text-green-600"} />}
      </div>

      <AddTransactionForm assetId={a.id} category={a.category} currency={a.currency} />

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-2">交易记录 ({txList.length})</h2>
        {txList.length === 0 ? <p className="text-gray-400 text-sm">暂无</p> : (
          <div className="space-y-2">
            {txList.map((tx) => (
              <div key={tx.id} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{TX_TYPE_LABELS[tx.type]}</p>
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
                <div className="text-right">
                  {inv && <p className="text-xs text-gray-500">{tx.quantity} @ {formatCurrency(tx.price, a.currency)}</p>}
                  <p className="text-sm font-mono">{formatCurrency(tx.amount, a.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${color || ""}`}>{value}</span>
    </div>
  );
}
