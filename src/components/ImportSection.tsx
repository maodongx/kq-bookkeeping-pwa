"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

type ImportMode = "merge" | "replace";

export function ImportSection() {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      alert("请先选择文件");
      return;
    }

    if (
      mode === "replace" &&
      !confirm("替换模式将删除所有现有数据，确定继续？")
    ) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch(`/api/import?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(`导入失败: ${data.error}`);
      } else {
        const c = data.counts;
        setResult(
          `导入成功: ${c.assets} 资产, ${c.transactions} 交易, ${c.priceSnapshots} 价格快照, ${c.exchangeRateSnapshots} 汇率快照`
        );
        router.refresh();
      }
    } catch (e) {
      setResult(
        "导入失败: " + (e instanceof Error ? e.message : "文件格式错误")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-gray-700"
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">模式:</span>
        <div className="inline-flex rounded-full bg-gray-100 p-0.5">
          <button
            onClick={() => setMode("merge")}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              mode === "merge"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500"
            }`}
          >
            合并
          </button>
          <button
            onClick={() => setMode("replace")}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              mode === "replace"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-500"
            }`}
          >
            替换
          </button>
        </div>
      </div>

      <button
        onClick={handleImport}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50"
      >
        <Upload size={16} />
        {loading ? "导入中..." : "导入数据"}
      </button>

      {result && (
        <p
          className={`text-xs ${
            result.startsWith("导入成功") ? "text-green-600" : "text-red-600"
          }`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
