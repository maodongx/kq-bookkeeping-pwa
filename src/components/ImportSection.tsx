"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Tabs, Button, Input, toast } from "@heroui/react";
import { useConfirmDialog } from "@/components/ConfirmDialog";

type ImportMode = "merge" | "replace";

export function ImportSection() {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [confirm, ConfirmDialog] = useConfirmDialog();

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.warning("请先选择文件");
      return;
    }

    if (mode === "replace") {
      const ok = await confirm({
        heading: "确定使用替换模式？",
        body: "替换模式将删除所有现有数据后再导入。此操作不可恢复。",
        status: "danger",
        confirmLabel: "继续替换",
      });
      if (!ok) return;
    }

    setLoading(true);

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
        toast.danger("导入失败", { description: data.error });
      } else {
        const c = data.counts;
        toast.success("导入成功", {
          description: `${c.assets} 资产, ${c.transactions} 交易, ${c.priceSnapshots} 价格快照, ${c.exchangeRateSnapshots} 汇率快照`,
        });
        router.refresh();
      }
    } catch (e) {
      toast.danger("导入失败", {
        description: e instanceof Error ? e.message : "文件格式错误",
      });
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
              <Tabs.Tab id="merge">
                合并<Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="replace">
                替换<Tabs.Indicator />
              </Tabs.Tab>
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

      <ConfirmDialog />
    </div>
  );
}
