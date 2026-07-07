"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseClientConfigured } from "@/supabase-browser";

interface AuthConfigResponse {
  authEnabled: boolean;
}

export interface CoffeeAuth {
  isAuthEnabled: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  message: string;
  getAuthHeaders: () => Promise<Record<string, string>>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message === "Invalid login credentials" ? "邮箱或密码不正确。" : error.message);
    }
  }, [isAuthEnabled]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isAuthEnabled) {
      setMessage("多人登录还没有配置完成。");
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(data.session ? "注册成功，已登录。" : "注册成功，请查收邮箱并完成确认。");
  }, [isAuthEnabled]);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();
    setMessage("");
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
    signOut,
    clearMessage: () => setMessage(""),
  };
}
