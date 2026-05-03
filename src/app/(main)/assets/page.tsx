import { createClient } from "@/lib/supabase/server";
import { Asset } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/currency";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, Chip, Link as HeroLink } from "@heroui/react";

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });
  const assets = (data || []) as Asset[];

  const grouped = assets.reduce((acc, asset) => {
    (acc[asset.category] ||= []).push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">资产</h1>
        <Link href="/assets/add" className="button button--primary button--md">
          + 添加
        </Link>
      </div>

      {assets.length === 0 ? (
        <Card className="py-4 text-center">
          <Card.Content>
            <p className="mb-2 text-4xl">📦</p>
            <p className="text-muted">暂无资产</p>
            <HeroLink href="/assets/add" className="mt-2 inline-block text-sm">
              添加第一笔资产 →
            </HeroLink>
          </Card.Content>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <h2 className="px-1 text-sm font-medium text-muted">
              {CATEGORY_LABELS[category as Asset["category"]]}
            </h2>
            <Card>
              <Card.Content className="divide-y divide-separator p-0">
                {items.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/assets/${asset.id}`}
                    className="flex items-center justify-between p-3 transition-colors hover:bg-default"
                  >
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      {asset.symbol && (
                        <Chip variant="secondary" size="sm" className="mt-0.5">
                          {asset.symbol}
                        </Chip>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                ))}
              </Card.Content>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
