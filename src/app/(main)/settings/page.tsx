import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Currency } from "@/lib/types";
import { Card, Separator, Button } from "@heroui/react";
import { CurrencyPreferencePicker } from "@/components/CurrencyPreferencePicker";
import { ExportButton } from "@/components/ExportButton";
import { ImportSection } from "@/components/ImportSection";

/**
 * Static shell — title paints immediately; account / preferences /
 * data-management cards stream in. Settings is lighter than the other
 * pages (one getUser query), but the same pattern keeps the perceived
 * response consistent across tabs.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">设置</h1>
      <Suspense fallback={<SettingsBodySkeleton />}>
        <SettingsBody />
      </Suspense>
    </div>
  );
}

async function SettingsBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultCurrency =
    (user?.user_metadata?.default_currency as Currency) || "USD";

  return (
    <>
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
        <Button variant="danger" fullWidth type="submit">
          退出登录
        </Button>
      </form>
    </>
  );
}

function SettingsBodySkeleton() {
  return (
    <>
      <div className="h-20 animate-pulse rounded-2xl bg-default" />
      <div className="h-24 animate-pulse rounded-2xl bg-default" />
      <div className="h-40 animate-pulse rounded-2xl bg-default" />
      <div className="h-12 animate-pulse rounded-2xl bg-default" />
    </>
  );
}
