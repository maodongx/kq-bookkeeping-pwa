"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button, toast } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { computeHolding } from "@/lib/asset-calculations";
import { convertCurrency, fetchLatestRates } from "@/lib/exchange-rates";
import { todayLocal } from "@/lib/date";
import type { Asset, Transaction } from "@/lib/types";

/**
 * "下载" button on the assets page — exports one flat row per asset,
 * intended as input for external AI analysis. The shape is deliberately
 * slim (no per-transaction noise):
 *
 *   {
 *     name, code, category, tag, riskLevel,
 *     totalShares,  // units held, from computeHolding().totalQty
 *     totalValueUSD // market value converted to USD at the latest rate
 *   }
 *
 * USD is a fixed pivot currency here — independent of whatever the user
 * has set as their dashboard display currency — so the output is stable
 * across sessions for downstream analysis.
 */
export function DownloadAssetsButton() {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const supabase = createClient();
      // Paginated: this is a backup, so a silently truncated transaction list
      // would understate every holding with no indication anything was missing.
      const [
        { data: assets, error: ea },
        { rows: txList, error: et },
        rates,
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        fetchAllRows<Transaction>((from, to) =>
          supabase.from("transactions").select("*").range(from, to)
        ),
        fetchLatestRates(supabase),
      ]);

      if (ea) throw ea;
      if (et) throw new Error(et);

      const assetList = (assets ?? []) as Asset[];

      const rows = assetList.map((asset) => {
        const { totalQty, marketValue } = computeHolding(asset, txList);
        return {
          name: asset.name,
          code: asset.symbol, // "code" is the user-facing term; DB column is `symbol`
          category: asset.category,
          tag: asset.tag,
          riskLevel: asset.risk_level,
          totalShares: totalQty,
          totalValueUSD: convertCurrency(
            marketValue,
            asset.currency,
            "USD",
            rates
          ),
        };
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        currency: "USD",
        schemaVersion: 2,
        assets: rows,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kq-bookkeeping-${todayLocal()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("已下载");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.danger("下载失败", { description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="md"
      isIconOnly
      onPress={handleDownload}
      isDisabled={busy}
      aria-label="下载资产数据"
    >
      <Download size={20} />
    </Button>
  );
}
