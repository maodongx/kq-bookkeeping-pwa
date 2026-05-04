"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, AssetTag, RiskLevel, Currency, FundProvider } from "@/lib/types";
import { CATEGORY_LABELS, CURRENCY_LABELS, TAG_LABELS, RISK_LABELS } from "@/lib/currency";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export default function AddAssetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("usStock");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [symbol, setSymbol] = useState("");
  const [fundProvider, setFundProvider] = useState<FundProvider>("mufg");
  const [tag, setTag] = useState<AssetTag | "">("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "">("");
  const [note, setNote] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [loading, setLoading] = useState(false);

  const isInvestment = category === "usStock" || category === "jpFund" || category === "cnFund";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        name: name.trim(),
        category,
        currency,
        symbol: symbol.trim() || null,
        fund_provider: category === "jpFund" ? fundProvider : category === "cnFund" ? "other" : null,
        tag: tag || null,
        risk_level: riskLevel || null,
        note: note.trim() || null,
      })
      .select()
      .single();

    if (error || !asset) {
      alert("添加失败: " + error?.message);
      setLoading(false);
      return;
    }

    if (!isInvestment && initialBalance && parseFloat(initialBalance) > 0) {
      const amt = parseFloat(initialBalance);
      await supabase.from("transactions").insert({
        asset_id: asset.id,
        type: "deposit",
        quantity: amt,
        price: 1,
        amount: amt,
        date: new Date().toISOString().split("T")[0],
      });
    }
    router.push("/assets");
    router.refresh();
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">添加资产</h1>
      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>资产类型</Label>
              <NativeSelect
                value={category}
                onChange={(e) => {
                  const c = e.target.value as AssetCategory;
                  setCategory(c);
                  if (c === "usStock") setCurrency("USD");
                  if (c === "jpFund") setCurrency("JPY");
                  if (c === "cnFund") setCurrency("CNY");
                }}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>币种</Label>
              <NativeSelect
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {Object.entries(CURRENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </NativeSelect>
            </div>

            {isInvestment && (
              <div className="space-y-2">
                <Label>代码</Label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="如 AAPL"
                />
              </div>
            )}

            {category === "jpFund" && (
              <div className="space-y-2">
                <Label>基金公司</Label>
                <NativeSelect
                  value={fundProvider}
                  onChange={(e) => setFundProvider(e.target.value as FundProvider)}
                >
                  <option value="mufg">三菱UFJ</option>
                  <option value="rakuten">乐天证券</option>
                  <option value="other">其他</option>
                </NativeSelect>
              </div>
            )}

            {!isInvestment && (
              <div className="space-y-2">
                <Label>初始余额</Label>
                <Input
                  type="number"
                  step="any"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>标签</Label>
              <NativeSelect
                value={tag}
                onChange={(e) => setTag(e.target.value as AssetTag | "")}
              >
                <option value="">无</option>
                {TAG_LABELS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>风险等级</Label>
              <NativeSelect
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel | "")}
              >
                <option value="">无</option>
                {Object.entries(RISK_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onPress={() => router.back()}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isDisabled={loading || !name.trim()}
              >
                {loading ? "..." : "添加"}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
