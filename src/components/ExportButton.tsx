"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button, toast } from "@heroui/react";

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || "kq-bookkeeping-export.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.danger("导出失败", {
        description: e instanceof Error ? e.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      fullWidth
      onPress={handleExport}
      isDisabled={loading}
    >
      <Download />
      {loading ? "导出中..." : "导出数据 (JSON)"}
    </Button>
  );
}
