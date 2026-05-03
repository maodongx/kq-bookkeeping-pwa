"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <button onClick={handleDelete} className="text-red-500 text-sm">删除</button>
  );
}
