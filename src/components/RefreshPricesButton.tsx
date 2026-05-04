"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshAllPrices } from "@/lib/prices";
import { Button } from "@heroui/react";

export function RefreshPricesButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    try {
      await refreshAllPrices();
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
