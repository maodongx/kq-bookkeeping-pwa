"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, Currency, FundProvider } from "@/lib/types";
import { CATEGORY_LABELS, CURRENCY_LABELS } from "@/lib/currency";

export default function AddAssetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("usStock");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [symbol, setSymbol] = useState("");
  const [fundProvider, setFundProvider] = useState<FundProvider>("mufg");
  const [note, setNote] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [loading, setLoading] = useState(false);

  const isInvestment = category === "usStock" || category === "jpFund";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: asset, error } = await supabase.from("assets").insert({
      name: name.trim(), category, currency,
      symbol: symbol.trim() || null,
      fund_provider: category === "jpFund" ? fundProvider : null,
      note: note.trim() || null,
    }).select().single();

    if (error || !asset) { alert("添加失败: " + error?.message); setLoading(false); return; }

    if (!isInvestment && initialBalance && parseFloat(initialBalance) > 0) {
      const amt = parseFloat(initialBalance);
      await supabase.from("transactions").insert({
        asset_id: asset.id, type: "deposit", quantity: amt, price: 1, amount: amt,
        date: new Date().toISOString().split("T")[0],
      });
    }
    router.push("/assets");
    router.refresh();
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">添加资产</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">资产类型</label>
          <select value={category} onChange={(e) => {
            const c = e.target.value as AssetCategory;
            setCategory(c);
            if (c === "usStock") setCurrency("USD");
            if (c === "jpFund") setCurrency("JPY");
          }} className="input">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="input">
            {Object.entries(CURRENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {isInvestment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="input" placeholder="如 AAPL" />
          </div>
        )}
        {category === "jpFund" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">基金公司</label>
            <select value={fundProvider} onChange={(e) => setFundProvider(e.target.value as FundProvider)} className="input">
              <option value="mufg">三菱UFJ</option>
              <option value="rakuten">乐天证券</option>
              <option value="other">其他</option>
            </select>
          </div>
        )}
        {!isInvestment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">初始余额</label>
            <input type="number" step="any" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="input" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2 rounded-lg border text-gray-600">取消</button>
          <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
            {loading ? "..." : "添加"}
          </button>
        </div>
      </form>
    </div>
  );
}
