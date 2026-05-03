"use client";

import { useState } from "react";
import { Download } from "lucide-react";

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
      alert("导出失败: " + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50"
    >
      <Download size={16} />
      {loading ? "导出中..." : "导出数据 (JSON)"}
    </button>
  );
}
