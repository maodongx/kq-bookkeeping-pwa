import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-16 overflow-y-auto">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50">
        <Link href="/" className="flex flex-col items-center text-xs text-gray-600">
          <span className="text-xl">📊</span>总览
        </Link>
        <Link href="/assets" className="flex flex-col items-center text-xs text-gray-600">
          <span className="text-xl">🏦</span>资产
        </Link>
        <Link href="/charts" className="flex flex-col items-center text-xs text-gray-600">
          <span className="text-xl">📈</span>分析
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-xs text-gray-600">
          <span className="text-xl">⚙️</span>设置
        </Link>
      </nav>
    </div>
  );
}
