import { createClient } from "@/lib/supabase/server";
import { Asset, Transaction } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, isInvestment } from "@/lib/currency";
import Link from "next/link";
import { DeleteAssetButton } from "@/components/DeleteAssetButton";
import { AddTransactionForm } from "@/components/AddTransactionForm";
import { EditPriceButton } from "@/components/EditPriceButton";
import { TransactionList } from "@/components/TransactionList";

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
        <div className="flex items-center gap-2">
          <Link href={`/assets/${a.id}/edit`} className="text-blue-600 text-sm">编辑</Link>
          <DeleteAssetButton assetId={a.id} />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-bold">{a.name}</h1>
        <p className="text-sm text-gray-500">{CATEGORY_LABELS[a.category]} · {a.currency}{a.symbol ? ` · ${a.symbol}` : ""}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2 text-sm">
        {inv && <Row label="持有数量" value={totalQty.toFixed(4)} />}
        {inv && <Row label="平均成本" value={totalQty > 0 ? formatCurrency(totalCost / totalQty, a.currency) : "-"} />}
        {inv && (
          <div className="flex justify-between">
            <span className="text-gray-500">当前价格</span>
            <EditPriceButton assetId={a.id} currentPrice={a.current_price} currency={a.currency} />
          </div>
        )}
        <Row label={inv ? "市值" : "余额"} value={formatCurrency(marketValue, a.currency)} />
        {inv && <Row label="盈亏" value={`${formatCurrency(gainLoss, a.currency)} (${gainLoss >= 0 ? "+" : ""}${gainPct.toFixed(2)}%)`} color={gainLoss >= 0 ? "text-red-600" : "text-green-600"} />}
      </div>

      <AddTransactionForm assetId={a.id} category={a.category} currency={a.currency} />

      <TransactionList transactions={txList} category={a.category} currency={a.currency} />
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
