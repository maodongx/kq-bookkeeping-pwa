"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button, toast } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { todayLocal } from "@/lib/date";

/**
 * "下载" button on the assets page — dumps the full bookkeeping dataset
 * as a JSON file for external AI analysis. Pulls fresh rows from
 * Supabase rather than reusing the server-rendered view so the download
 * always reflects the live DB state at click time.
 *
 * The payload intentionally ships raw DB rows (no display-currency
 * conversion) so downstream tooling can apply its own normalization.
 * Exchange rates and price snapshots are included so conversions can
 * be reproduced offline.
 */
export function DownloadAssetsButton() {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const supabase = createClient();
      const [
        { data: assets, error: ea },
        { data: transactions, error: et },
        { data: priceSnapshots, error: ep },
        { data: rateSnapshots, error: er },
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("asset_price_snapshots").select("*"),
        supabase.from("exchange_rate_snapshots").select("*"),
      ]);

      const firstError = ea ?? et ?? ep ?? er;
      if (firstError) throw firstError;

      const payload = {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        assets: assets ?? [],
        transactions: transactions ?? [],
        assetPriceSnapshots: priceSnapshots ?? [],
        exchangeRateSnapshots: rateSnapshots ?? [],
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
