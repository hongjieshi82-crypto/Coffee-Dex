"use client";

import { FormEvent, useState } from "react";
import { Coffee, Lock, Mail } from "lucide-react";
import type { CoffeeAuth } from "@/use-coffee-auth";

export function AuthGate({ auth, surface = "pc" }: { auth: CoffeeAuth; surface?: "pc" | "mobile" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6 || busy) return;

    setBusy(true);
    if (mode === "login") {
      await auth.signIn(email.trim(), password);
    } else {
      await auth.signUp(email.trim(), password);
    }
    setBusy(false);
  };

  if (auth.loading) {
    return (
      <main className={`auth-gate ${surface === "mobile" ? "mobile-view" : "pc-view"}`}>
        <div className="auth-gate-bg" />
        <section className="auth-gate-card">
          <div className="auth-gate-icon">
            <Coffee size={28} strokeWidth={1.8} />
          </div>
          <h1>Coffee-Dex</h1>
          <p>正在检查登录状态...</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`auth-gate ${surface === "mobile" ? "mobile-view" : "pc-view"}`}>
      <div className="auth-gate-bg" />
      <section className="auth-gate-card">
        <div className="auth-gate-icon">
          <Coffee size={28} strokeWidth={1.8} />
        </div>
        <h1>Coffee-Dex</h1>
        <p>登录后，每个人都会拥有自己的职场咖啡图鉴。</p>

        <div className="auth-gate-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            登录
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            注册
          </button>
        </div>

        <form onSubmit={submit} className="auth-gate-form">
          <label>
            <Mail size={16} />
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                auth.clearMessage();
              }}
              placeholder="邮箱地址"
              autoComplete="email"
            />
          </label>
          <label>
            <Lock size={16} />
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                auth.clearMessage();
              }}
              placeholder="密码，至少 6 位"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {auth.message && <div className="auth-gate-message">{auth.message}</div>}

          <button type="submit" disabled={!email.trim() || password.length < 6 || busy}>
            {busy ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <div className="auth-gate-foot">手机和电脑使用同一个账号同步数据。</div>
      </section>
    </main>
  );
}
