"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseClientConfigured } from "@/supabase-browser";

interface AuthConfigResponse {
  authEnabled: boolean;
}

export type SignUpResult = "signed-in" | "verification-sent";

export interface CoffeeAuth {
  isAuthEnabled: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  message: string;
  getAuthHeaders: () => Promise<Record<string, string>>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult | null>;
  verifySignUpCode: (email: string, token: string) => Promise<boolean>;
  resendSignUpCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearMessage: () => void;
}

export function useCoffeeAuth(): CoffeeAuth {
  const clientConfigured = isSupabaseClientConfigured();
  const [isAuthEnabled, setIsAuthEnabled] = useState(clientConfigured);
  const [loading, setLoading] = useState(clientConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!clientConfigured) {
      return;
    }

    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const setupAuth = async () => {
      try {
        const response = await fetch("/api/auth/config", { cache: "no-store" });
        const config = (await response.json()) as AuthConfigResponse;

        if (!mounted) return;

        if (!config.authEnabled) {
          setIsAuthEnabled(false);
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        const supabase = getBrowserSupabase();

        if (!supabase) {
          setIsAuthEnabled(false);
          setLoading(false);
          return;
        }

        setIsAuthEnabled(true);

        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch {
        if (!mounted) return;

        setIsAuthEnabled(false);
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    };

    void setupAuth();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [clientConfigured]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!isAuthEnabled) return {};

    const supabase = getBrowserSupabase();

    if (!supabase) return {};

    const activeSession = session ?? (await supabase.auth.getSession()).data.session;

    if (!activeSession?.access_token) return {};

    return { Authorization: `Bearer ${activeSession.access_token}` };
  }, [isAuthEnabled, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message === "Invalid login credentials" ? "邮箱或密码不正确。" : error.message);
      }
    } catch {
      setMessage("登录失败，请检查网络后重试。");
    }
  }, [isAuthEnabled]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return null;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return null;

    setMessage("");
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
  }, [isAuthEnabled]);

  const verifySignUpCode = useCallback(async (email: string, token: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return false;
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
  }, [isAuthEnabled]);

  const resendSignUpCode = useCallback(async (email: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
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
  }, [isAuthEnabled]);

  const signOut = useCallback(async () => {
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
  }, []);

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
