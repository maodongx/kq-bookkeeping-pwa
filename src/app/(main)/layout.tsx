import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomTabBar } from "@/components/BottomTabBar";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomTabBar />
    </div>
  );
}
