"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { BrandLogo } from "@/app/BrandLogo";
import type { CoffeeAuth } from "@/use-coffee-auth";

type AuthView = "password" | "email-code" | "signup" | "signup-code" | "forgot" | "reset-code";

const codeViews: AuthView[] = ["email-code", "signup-code", "reset-code"];

export function AuthGate({ auth, surface = "pc" }: { auth: CoffeeAuth; surface?: "pc" | "mobile" }) {
  const [view, setView] = useState<AuthView>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const switchView = (nextView: AuthView) => {
    setView(nextView);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    auth.clearMessage();
  };

  const sendCode = async (kind: "login" | "signup" | "reset") => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || busy || cooldown) return;
    setBusy(true);
    try {
      const sent = kind === "login"
        ? await auth.sendLoginCode(normalizedEmail)
        : kind === "signup"
          ? (await auth.signUp(normalizedEmail, password)) === "verification-sent"
          : await auth.startPasswordReset(normalizedEmail);
      if (sent) {
        setCooldown(60);
        setCode("");
        setView(kind === "login" ? "email-code" : kind === "signup" ? "signup-code" : "reset-code");
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (busy) return;

    if (view === "signup" || view === "reset-code") {
      if (password.length < 6) return;
      if (password !== confirmPassword) {
        auth.clearMessage();
        return;
      }
    }

    if (view === "signup") {
      await sendCode("signup");
      return;
    }
    if (view === "forgot") {
      await sendCode("reset");
      return;
    }

    setBusy(true);
    try {
      if (view === "password") {
        await auth.signIn(normalizedEmail, password);
      } else if (view === "email-code") {
        await auth.verifyLoginCode(normalizedEmail, code);
      } else if (view === "signup-code") {
        await auth.verifySignUpCode(normalizedEmail, code);
      } else {
        await auth.resetPasswordWithCode(normalizedEmail, code, password);
      }
    } finally {
      setBusy(false);
    }
  };

  const title = view === "signup" || view === "signup-code"
    ? "创建你的咖啡图鉴"
    : view === "forgot" || view === "reset-code"
      ? "重置登录密码"
      : "登录后同步你的咖啡图鉴";
  const codeTitle = view === "signup-code" ? "完成邮箱验证后将自动进入图鉴。" : view === "reset-code" ? "验证邮箱后，重置成功将自动登录。" : "输入邮箱验证码，验证成功后自动进入图鉴。";
  const hasPassword = view === "password" || view === "signup" || view === "reset-code";
  const hasConfirmation = view === "signup" || view === "reset-code";

  if (auth.loading) {
    return (
      <main className={`auth-gate ${surface === "mobile" ? "mobile-view" : "pc-view"}`}>
        <div className="auth-gate-bg" />
        <section className="auth-gate-card">
          <BrandLogo className="auth-gate-logo" sizes="76px" preload />
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
        <BrandLogo className="auth-gate-logo" sizes="76px" preload />
        <h1>Coffee-Dex</h1>
        <p>{codeViews.includes(view) ? codeTitle : title}</p>

        {!codeViews.includes(view) && (
          <div className="auth-gate-tabs">
            <button type="button" className={view === "password" || view === "email-code" ? "active" : ""} onClick={() => switchView("password")}>登录</button>
            <button type="button" className={view === "signup" || view === "signup-code" ? "active" : ""} onClick={() => switchView("signup")}>注册</button>
          </div>
        )}

        <form onSubmit={submit} className="auth-gate-form">
          {codeViews.includes(view) ? (
            <>
              <div className="auth-gate-code-mail">验证码已发送至 <span>{email.trim()}</span></div>
              <Field icon="code" value={code} onChange={(value) => { setCode(value.replace(/\s/g, "").slice(0, 8)); auth.clearMessage(); }} placeholder="输入邮箱验证码" type="text" autoComplete="one-time-code" />
            </>
          ) : (
            <Field icon="email" value={email} onChange={(value) => { setEmail(value); auth.clearMessage(); }} placeholder="邮箱地址" type="email" autoComplete="email" />
          )}

          {hasPassword && <Field icon="password" value={password} onChange={(value) => { setPassword(value); auth.clearMessage(); }} placeholder={view === "password" ? "密码" : "密码，至少 6 位"} type="password" autoComplete={view === "password" ? "current-password" : "new-password"} />}
          {hasConfirmation && <Field icon="password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); auth.clearMessage(); }} placeholder="确认密码" type="password" autoComplete="new-password" />}
          {hasConfirmation && confirmPassword && password !== confirmPassword && <div className="auth-gate-message">两次输入的密码不一致。</div>}
          {auth.message && <div className="auth-gate-message">{auth.message}</div>}

          <button type="submit" disabled={busy || !email.trim() || (hasPassword && password.length < 6) || (hasConfirmation && password !== confirmPassword) || (codeViews.includes(view) && !code.trim())}>
            {busy ? "处理中..." : view === "password" ? "密码登录" : view === "email-code" ? "验证并登录" : view === "signup" ? "发送注册验证码" : view === "signup-code" ? "验证并进入图鉴" : view === "forgot" ? "发送重置验证码" : "重置密码并登录"}
          </button>

          {view === "password" && <div className="auth-gate-secondary"><button type="button" onClick={() => void sendCode("login")}>邮箱验证码登录</button><button type="button" onClick={() => switchView("forgot")}>忘记密码？</button></div>}
          {view === "forgot" && <button type="button" className="auth-gate-text-button" onClick={() => switchView("password")}>返回密码登录</button>}
          {codeViews.includes(view) && <div className="auth-gate-code-actions"><button type="button" onClick={() => sendCode(view === "signup-code" ? "signup" : view === "reset-code" ? "reset" : "login")} disabled={busy || cooldown > 0}>{cooldown ? `${cooldown} 秒后可重发` : "重新发送"}</button><button type="button" onClick={() => switchView(view === "signup-code" ? "signup" : view === "reset-code" ? "forgot" : "password")}>返回</button></div>}
        </form>

        <div className="auth-gate-foot">仅支持邮箱登录。验证码有效期为 10 分钟。</div>
      </section>
    </main>
  );
}

function Field({ icon, value, onChange, placeholder, type, autoComplete }: { icon: "email" | "password" | "code"; value: string; onChange: (value: string) => void; placeholder: string; type: string; autoComplete: string }) {
  const Icon = icon === "email" ? Mail : Lock;
  return <label><Icon size={16} /><input type={type} inputMode={icon === "code" ? "numeric" : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} /></label>;
}
