"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Tabs } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Input ref={fileRef} type="file" accept=".json" />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">模式:</span>
        <Tabs
          selectedKey={mode}
          onSelectionChange={(k) => setMode(k as ImportMode)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="导入模式">
              <Tabs.Tab id="merge">合并<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="replace">替换<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <Button
        variant="outline"
        fullWidth
        onPress={handleImport}
        isDisabled={loading}
      >
        <Upload />
        {loading ? "导入中..." : "导入数据"}
      </Button>

      {result && (
        <p
          className={`text-xs ${
            result.startsWith("导入成功")
              ? "text-success"
              : "text-danger"
          }`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
