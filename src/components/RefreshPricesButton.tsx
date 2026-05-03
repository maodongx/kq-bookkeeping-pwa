"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshAllPrices } from "@/lib/prices";

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
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="p-2 rounded-lg text-gray-500 active:bg-gray-100 disabled:opacity-50"
      aria-label="刷新价格"
    >
      <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
    </button>
  );
}
