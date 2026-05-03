"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirm("确定删除此资产？所有交易记录将一并删除。")) return;
    await supabase.from("assets").delete().eq("id", assetId);
    router.push("/assets");
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onPress={handleDelete}>
      删除
    </Button>
  );
}
