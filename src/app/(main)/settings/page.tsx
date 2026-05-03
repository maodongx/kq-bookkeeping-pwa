import { createClient } from "@/lib/supabase/server";
import { Currency } from "@/lib/types";
import { Card, Separator } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { CurrencyPreferencePicker } from "@/components/CurrencyPreferencePicker";
import { ExportButton } from "@/components/ExportButton";
import { ImportSection } from "@/components/ImportSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const defaultCurrency =
    (user?.user_metadata?.default_currency as Currency) || "USD";

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">设置</h1>

      <Card>
        <Card.Content className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">账号</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">版本</span>
            <span>1.0.0</span>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>显示偏好</Card.Title>
        </Card.Header>
        <Card.Content>
          <CurrencyPreferencePicker current={defaultCurrency} />
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>数据管理</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-3">
          <ExportButton />
          <Separator />
          <ImportSection />
        </Card.Content>
      </Card>

      <form action="/api/auth/signout" method="POST">
        <Button variant="destructive" fullWidth>
          退出登录
        </Button>
      </form>
    </div>
  );
}
