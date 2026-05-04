"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, toast } from "@heroui/react";
import { useConfirmDialog } from "@/components/ConfirmDialog";

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirm, ConfirmDialog] = useConfirmDialog();

  async function handleDelete() {
    const ok = await confirm({
      heading: "确定删除此资产？",
      body: "删除后所有交易记录将一并删除，此操作不可恢复。",
      status: "danger",
      confirmLabel: "删除",
    });
    if (!ok) return;

    const { error } = await supabase.from("assets").delete().eq("id", assetId);
    if (error) {
      toast.danger("删除失败", { description: error.message });
      return;
    }
    router.push("/assets");
    router.refresh();
  }

  return (
    <>
      <Button variant="danger" size="sm" onPress={handleDelete}>
        删除
      </Button>
      <ConfirmDialog />
    </>
  );
}
