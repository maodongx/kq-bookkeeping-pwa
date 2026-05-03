import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">设置</h1>
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">账号</span>
          <span>{user?.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">版本</span>
          <span>1.0.0</span>
        </div>
      </div>
      <form action="/api/auth/signout" method="POST">
        <button type="submit" className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium">
          退出登录
        </button>
      </form>
    </div>
  );
}
