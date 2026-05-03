import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomTabBar } from "@/components/BottomTabBar";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
