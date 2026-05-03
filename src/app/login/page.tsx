"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Label, TextField } from "@heroui/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <Card.Header className="text-center">
          <Card.Title className="text-2xl">KQ 记账</Card.Title>
          <Card.Description>家庭资产管理</Card.Description>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <TextField name="email" type="email" isRequired>
              <Label>邮箱</Label>
              <Input
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="secondary"
              />
            </TextField>

            <TextField name="password" type="password" isRequired>
              <Label>密码</Label>
              <Input
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="secondary"
              />
            </TextField>

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <Button type="submit" className="w-full" isDisabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
