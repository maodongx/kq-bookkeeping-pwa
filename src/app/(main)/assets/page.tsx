import { createClient } from "@/lib/supabase/server";
import { Asset } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/currency";
import Link from "next/link";

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
  const assets = (data || []) as Asset[];

  const grouped = assets.reduce((acc, asset) => {
    (acc[asset.category] ||= []).push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">资产</h1>
        <Link href="/assets/add" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
          + 添加
        </Link>
      </div>
      {assets.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p>暂无资产</p>
          <Link href="/assets/add" className="text-blue-600 text-sm mt-2 inline-block">添加第一笔资产 →</Link>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <h2 className="text-sm font-medium text-gray-500 px-1">{CATEGORY_LABELS[category as Asset["category"]]}</h2>
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {items.map((asset) => (
                <Link key={asset.id} href={`/assets/${asset.id}`} className="flex justify-between items-center p-3">
                  <div>
                    <p className="font-medium text-sm">{asset.name}</p>
                    {asset.symbol && <p className="text-xs text-gray-400">{asset.symbol}</p>}
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
