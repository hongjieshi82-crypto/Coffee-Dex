"use client";

import { FormEvent, useState } from "react";
import { Coffee, Lock, Mail } from "lucide-react";
import type { CoffeeAuth } from "@/use-coffee-auth";

export function AuthGate({ auth, surface = "pc" }: { auth: CoffeeAuth; surface?: "pc" | "mobile" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<"form" | "verify">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedCode = verificationCode.trim();

    if (mode === "signup" && signupStep === "verify") {
      if (!pendingEmail || trimmedCode.length < 4 || busy) return;

      setBusy(true);
      try {
        await auth.verifySignUpCode(pendingEmail, trimmedCode);
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!trimmedEmail || password.length < 6 || busy) return;

    setBusy(true);
    try {
      if (mode === "login") {
        await auth.signIn(trimmedEmail, password);
      } else {
        const result = await auth.signUp(trimmedEmail, password);

        if (result === "verification-sent") {
          setPendingEmail(trimmedEmail);
          setVerificationCode("");
          setSignupStep("verify");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setSignupStep("form");
    setPendingEmail("");
    setVerificationCode("");
    auth.clearMessage();
  };

  const resendCode = async () => {
    if (!pendingEmail || resending) return;

    setResending(true);
    try {
      await auth.resendSignUpCode(pendingEmail);
    } finally {
      setResending(false);
    }
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
        <p>
          {signupStep === "verify"
            ? "输入邮箱验证码，验证成功后会自动进入图鉴。"
            : "登录后，每个人都会拥有自己的职场咖啡图鉴。"}
        </p>

        <div className="auth-gate-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => switchMode("login")}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}
          >
            注册
          </button>
        </div>

        <form onSubmit={submit} className="auth-gate-form">
          {mode === "signup" && signupStep === "verify" ? (
            <>
              <div className="auth-gate-code-mail">
                验证码已发送至 <span>{pendingEmail}</span>
              </div>
              <label>
                <Lock size={16} />
                <input
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(event.target.value.replace(/\s/g, "").slice(0, 8));
                    auth.clearMessage();
                  }}
                  placeholder="输入邮箱验证码"
                  autoComplete="one-time-code"
                />
              </label>
            </>
          ) : (
            <>
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
            </>
          )}

          {auth.message && <div className="auth-gate-message">{auth.message}</div>}

          <button
            type="submit"
            disabled={
              mode === "signup" && signupStep === "verify"
                ? !verificationCode.trim() || busy
                : !email.trim() || password.length < 6 || busy
            }
          >
            {busy ? "处理中..." : mode === "signup" && signupStep === "verify" ? "验证并进入图鉴" : mode === "login" ? "登录" : "注册"}
          </button>

          {mode === "signup" && signupStep === "verify" && (
            <div className="auth-gate-code-actions">
              <button type="button" onClick={resendCode} disabled={resending}>
                {resending ? "发送中..." : "重新发送"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupStep("form");
                  setPendingEmail("");
                  setVerificationCode("");
                  auth.clearMessage();
                }}
              >
                换邮箱
              </button>
            </div>
          )}
        </form>

        <div className="auth-gate-foot">手机和电脑使用同一个账号同步数据。</div>
      </section>
    </main>
  );
}
