"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/supabase-browser";

type AuthMode = "supabase" | "local";

interface AuthConfigResponse {
  authEnabled: boolean;
  authMode?: AuthMode;
}

export interface CoffeeUser {
  id: string;
  email?: string | null;
}

interface LocalSession {
  access_token: string;
  user: CoffeeUser;
}

interface LocalAuthResponse {
  access_token?: string;
  user?: CoffeeUser;
  verificationRequired?: boolean;
  ok?: boolean;
  error?: string;
}

export type SignUpResult = "signed-in" | "verification-sent";

type LocalSignupResult =
  | { status: "signed-in"; session: LocalSession }
  | { status: "verification-sent" };

export interface CoffeeAuth {
  isAuthEnabled: boolean;
  loading: boolean;
  user: CoffeeUser | null;
  session: Session | LocalSession | null;
  message: string;
  getAuthHeaders: () => Promise<Record<string, string>>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult | null>;
  verifySignUpCode: (email: string, token: string) => Promise<boolean>;
  resendSignUpCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearMessage: () => void;
}

const localTokenKey = "coffee-dex-local-token";

export function useCoffeeAuth(): CoffeeAuth {
  const [authMode, setAuthMode] = useState<AuthMode>("local");
  const [isAuthEnabled, setIsAuthEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CoffeeUser | null>(null);
  const [session, setSession] = useState<Session | LocalSession | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const setupAuth = async () => {
      try {
        const response = await fetch("/api/auth/config", { cache: "no-store" });
        const config = (await response.json()) as AuthConfigResponse;
        const nextMode: AuthMode = config.authMode === "supabase" ? "supabase" : "local";

        if (!mounted) return;

        setAuthMode(nextMode);
        setIsAuthEnabled(config.authEnabled !== false);

        if (config.authEnabled === false) {
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        if (nextMode === "supabase") {
          const supabase = getBrowserSupabase();

          if (!supabase) {
            setUser(null);
            setSession(null);
            setMessage("Supabase 前端环境变量缺失，无法登录。");
            setLoading(false);
            return;
          }

          const { data } = await supabase.auth.getSession();

          if (!mounted) return;

          setSession(data.session);
          setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null);
          setLoading(false);

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setUser(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email } : null);
            setLoading(false);
          });

          unsubscribe = () => subscription.unsubscribe();
          return;
        }

        const token = getStoredLocalToken();

        if (!token) {
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        const localSession = await validateLocalToken(token);

        if (!mounted) return;

        if (localSession) {
          setUser(localSession.user);
          setSession(localSession);
        } else {
          removeStoredLocalToken();
          setUser(null);
          setSession(null);
        }

        setLoading(false);
      } catch {
        if (!mounted) return;

        setAuthMode("local");
        setIsAuthEnabled(true);
        setUser(null);
        setSession(null);
        setMessage("登录服务暂时不可用，请稍后重试。");
        setLoading(false);
      }
    };

    void setupAuth();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!isAuthEnabled) return {};

    if (authMode === "local") {
      const token = isLocalSession(session) ? session.access_token : getStoredLocalToken();

      return token ? { Authorization: `Bearer ${token}` } : {};
    }

    const supabase = getBrowserSupabase();

    if (!supabase) return {};

    const activeSession = isSupabaseSession(session) ? session : (await supabase.auth.getSession()).data.session;

    if (!activeSession?.access_token) return {};

    return { Authorization: `Bearer ${activeSession.access_token}` };
  }, [authMode, isAuthEnabled, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return;
    }

    setMessage("");

    if (authMode === "local") {
      const localSession = await submitLocalAuth("signin", email, password, setMessage);

      if (localSession) {
        storeLocalToken(localSession.access_token);
        setSession(localSession);
        setUser(localSession.user);
      }

      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message === "Invalid login credentials" ? "邮箱或密码不正确。" : error.message);
      }
    } catch {
      setMessage("登录失败，请检查网络后重试。");
    }
  }, [authMode, isAuthEnabled]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return null;
    }

    setMessage("");

    if (authMode === "local") {
      const localSignup = await submitLocalSignup(email, password, setMessage);

      if (!localSignup) return null;

      if (localSignup.status === "signed-in") {
        storeLocalToken(localSignup.session.access_token);
        setSession(localSignup.session);
        setUser(localSignup.session.user);
        setMessage("");
        return "signed-in";
      }

      setMessage("验证码已发送，请查收邮箱。");
      return "verification-sent";
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: getEmailRedirectOptions(),
      });

      if (error) {
        setMessage(error.message);
        return null;
      }

      if (data.session) {
        setMessage("");
        return "signed-in";
      }

      setMessage("验证码已发送，请查收邮箱。");
      return "verification-sent";
    } catch {
      setMessage("注册失败，请检查网络后重试。");
      return null;
    }
  }, [authMode, isAuthEnabled]);

  const verifySignUpCode = useCallback(async (email: string, token: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return false;
    }

    if (authMode === "local") {
      const localSession = await verifyLocalSignup(email, token, setMessage);

      if (!localSession) return false;

      storeLocalToken(localSession.access_token);
      setSession(localSession);
      setUser(localSession.user);
      setMessage("");

      return true;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return false;

    setMessage("");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
        options: getOtpRedirectOptions(),
      });

      if (error) {
        setMessage(error.message === "Token has expired or is invalid" ? "验证码不正确或已过期。" : error.message);
        return false;
      }

      setMessage("");
      return true;
    } catch {
      setMessage("验证失败，请检查网络后重试。");
      return false;
    }
  }, [authMode, isAuthEnabled]);

  const resendSignUpCode = useCallback(async (email: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return;
    }

    if (authMode === "local") {
      await resendLocalSignup(email, setMessage);
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: getEmailRedirectOptions(),
      });

      setMessage(error ? error.message : "验证码已重新发送。");
    } catch {
      setMessage("验证码发送失败，请稍后重试。");
    }
  }, [authMode, isAuthEnabled]);

  const signOut = useCallback(async () => {
    if (authMode === "local") {
      removeStoredLocalToken();
      setUser(null);
      setSession(null);
      setMessage("");
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      setMessage("");
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setUser(null);
      setSession(null);
      setMessage("");
    }
  }, [authMode]);

  return {
    isAuthEnabled,
    loading,
    user,
    session,
    message,
    getAuthHeaders,
    signIn,
    signUp,
    verifySignUpCode,
    resendSignUpCode,
    signOut,
    clearMessage: () => setMessage(""),
  };
}

async function submitLocalAuth(
  action: "signin" | "signup",
  email: string,
  password: string,
  setMessage: (message: string) => void
): Promise<LocalSession | null> {
  try {
    const response = await fetch("/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password }),
    });
    const data = (await response.json()) as LocalAuthResponse;

    if (!response.ok || !data.access_token || !data.user) {
      setMessage(data.error ?? "登录失败，请重试。");
      return null;
    }

    return {
      access_token: data.access_token,
      user: data.user,
    };
  } catch {
    setMessage("登录失败，请检查网络后重试。");
    return null;
  }
}

async function submitLocalSignup(
  email: string,
  password: string,
  setMessage: (message: string) => void
): Promise<LocalSignupResult | null> {
  try {
    const response = await fetch("/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signup", email, password }),
    });
    const data = (await response.json()) as LocalAuthResponse;

    if (!response.ok) {
      setMessage(data.error ?? "注册失败，请重试。");
      return null;
    }

    if (data.access_token && data.user) {
      return {
        status: "signed-in",
        session: {
          access_token: data.access_token,
          user: data.user,
        },
      };
    }

    if (data.verificationRequired) {
      return { status: "verification-sent" };
    }

    setMessage("注册失败，请重试。");
    return null;
  } catch {
    setMessage("注册失败，请检查网络后重试。");
    return null;
  }
}

async function verifyLocalSignup(
  email: string,
  code: string,
  setMessage: (message: string) => void
): Promise<LocalSession | null> {
  try {
    const response = await fetch("/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-signup", email, code }),
    });
    const data = (await response.json()) as LocalAuthResponse;

    if (!response.ok || !data.access_token || !data.user) {
      setMessage(data.error ?? "验证码不正确。");
      return null;
    }

    return {
      access_token: data.access_token,
      user: data.user,
    };
  } catch {
    setMessage("验证失败，请检查网络后重试。");
    return null;
  }
}

async function resendLocalSignup(email: string, setMessage: (message: string) => void) {
  try {
    const response = await fetch("/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend-signup", email }),
    });
    const data = (await response.json()) as LocalAuthResponse;

    setMessage(response.ok && data.ok ? "验证码已重新发送。" : data.error ?? "验证码发送失败。");
  } catch {
    setMessage("验证码发送失败，请稍后重试。");
  }
}

async function validateLocalToken(token: string): Promise<LocalSession | null> {
  try {
    const response = await fetch("/api/auth/local", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as LocalAuthResponse;

    if (!response.ok || !data.user) return null;

    return {
      access_token: token,
      user: data.user,
    };
  } catch {
    return null;
  }
}

function getStoredLocalToken() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(localTokenKey);
}

function storeLocalToken(token: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(localTokenKey, token);
}

function removeStoredLocalToken() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(localTokenKey);
}

function isLocalSession(value: Session | LocalSession | null): value is LocalSession {
  return Boolean(value && "access_token" in value && "user" in value && !("expires_at" in value));
}

function isSupabaseSession(value: Session | LocalSession | null): value is Session {
  return Boolean(value && "access_token" in value && "expires_at" in value);
}

function getAuthRedirectUrl() {
  if (typeof window === "undefined") return undefined;

  return window.location.origin;
}

function getEmailRedirectOptions() {
  const redirectTo = getAuthRedirectUrl();

  return redirectTo ? { emailRedirectTo: redirectTo } : undefined;
}

function getOtpRedirectOptions() {
  const redirectTo = getAuthRedirectUrl();

  return redirectTo ? { redirectTo } : undefined;
}
