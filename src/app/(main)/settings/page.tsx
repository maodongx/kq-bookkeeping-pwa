import { createClient } from "@/lib/supabase/server";
import { Currency } from "@/lib/types";
import { CurrencyPreferencePicker } from "@/components/CurrencyPreferencePicker";
import { ExportButton } from "@/components/ExportButton";
import { ImportSection } from "@/components/ImportSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const defaultCurrency =
    (user?.user_metadata?.default_currency as Currency) || "USD";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">设置</h1>

      {/* Account Info */}
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

      {/* Display Preferences */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-3">显示偏好</h2>
        <CurrencyPreferencePicker current={defaultCurrency} />
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-sm mb-1">数据管理</h2>
        <ExportButton />
        <div className="border-t pt-3">
          <ImportSection />
        </div>
      </div>

      {/* Logout */}
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium"
        >
          退出登录
        </button>
      </form>
    </div>
  );
}
