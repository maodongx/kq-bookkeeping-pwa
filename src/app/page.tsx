import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">KQ 记账</h1>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              退出登录
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg border p-6 text-center">
          <p className="text-gray-600">
            欢迎, {user.email}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            资产管理功能即将上线 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
