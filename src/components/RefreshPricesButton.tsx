"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshAllPrices } from "@/lib/prices";
import { Button, toast } from "@heroui/react";

export function RefreshPricesButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    try {
      // refreshAllPrices() already catches per-asset fetch failures and
      // returns them as arrays — it never throws. Surface them so the
      // user knows when e.g. a single broken symbol or rate lookup
      // didn't come through, rather than silently showing stale values.
      const { priceErrors, rateErrors } = await refreshAllPrices();
      const failures = priceErrors.length + rateErrors.length;
      if (failures > 0) {
        const sample = [...priceErrors, ...rateErrors].slice(0, 2).join("；");
        toast.danger(`${failures} 项刷新失败`, { description: sample });
      } else {
        toast.success("已刷新");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="md"
      isIconOnly
      onPress={handleRefresh}
      isDisabled={loading}
      aria-label="刷新价格"
    >
      <RefreshCw className={loading ? "animate-spin" : ""} />
    </Button>
  );
}
