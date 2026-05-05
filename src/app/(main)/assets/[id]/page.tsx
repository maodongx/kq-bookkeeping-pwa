import { createClient } from "@/lib/supabase/server";
import { Asset, Transaction } from "@/lib/types";
import { formatCurrency, CATEGORY_LABELS, RISK_LABELS, isInvestment, gainLossTextClass } from "@/lib/currency";
import { computeHolding } from "@/lib/asset-calculations";
import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { DeleteAssetButton } from "@/components/DeleteAssetButton";
import { AddTransactionForm } from "@/components/AddTransactionForm";
import { UpdateBalanceForm } from "@/components/UpdateBalanceForm";
import { EditPriceButton } from "@/components/EditPriceButton";
import { TransactionList } from "@/components/TransactionList";
import { LabelValueRow } from "@/components/LabelValueRow";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: asset } = await supabase.from("assets").select("*").eq("id", id).single();
  if (!asset) return <div className="p-4">资产不存在</div>;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("asset_id", id)
    .order("date", { ascending: false });
  const txList = (transactions || []) as Transaction[];
  const a = asset as Asset;
  const inv = isInvestment(a.category);

  const { totalQty, totalCost, balance, marketValue, gainLoss, gainPct } =
    computeHolding(a, txList);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link href="/assets" className="button button--ghost button--sm">
          ← 返回
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/assets/${a.id}/edit`}
            className="button button--ghost button--sm"
          >
            编辑
          </Link>
          <DeleteAssetButton assetId={a.id} />
        </div>
      </div>

      <Card>
        <Card.Header>
          <Card.Title className="text-lg">{a.name}</Card.Title>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip variant="secondary">{CATEGORY_LABELS[a.category]}</Chip>
            <Chip variant="tertiary">{a.currency}</Chip>
            {a.symbol && <Chip variant="tertiary">{a.symbol}</Chip>}
            {a.tag && <Chip variant="tertiary">{a.tag}</Chip>}
            {a.risk_level && <Chip variant="tertiary">{RISK_LABELS[a.risk_level]}</Chip>}
          </div>
        </Card.Header>
      </Card>

      <Card>
        <Card.Content className="space-y-2 text-sm">
          {inv && <LabelValueRow label="持有数量" value={totalQty.toFixed(4)} />}
          {inv && (
            <LabelValueRow
              label="平均成本"
              value={totalQty > 0 ? formatCurrency(totalCost / totalQty, a.currency) : "-"}
            />
          )}
          {inv && (
            <div className="flex justify-between">
              <span className="text-muted">当前价格</span>
              <EditPriceButton assetId={a.id} currentPrice={a.current_price} currency={a.currency} />
            </div>
          )}
          <LabelValueRow
            label={inv ? "市值" : "余额"}
            value={formatCurrency(marketValue, a.currency)}
          />
          {inv && (
            <LabelValueRow
              label="盈亏"
              value={`${formatCurrency(gainLoss, a.currency)} (${gainLoss >= 0 ? "+" : ""}${gainPct.toFixed(2)}%)`}
              className={gainLossTextClass(gainLoss)}
            />
          )}
        </Card.Content>
      </Card>

      {inv ? (
        <AddTransactionForm assetId={a.id} category={a.category} />
      ) : (
        <UpdateBalanceForm assetId={a.id} currentBalance={balance} currency={a.currency} />
      )}

      <TransactionList transactions={txList} category={a.category} currency={a.currency} />
    </div>
  );
}
