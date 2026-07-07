"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseClientConfigured } from "@/supabase-browser";

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
  const isAuthEnabled = isSupabaseClientConfigured();
  const [loading, setLoading] = useState(isAuthEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getBrowserSupabase();

    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = getBrowserSupabase();

    if (!supabase) return {};

    const activeSession = session ?? (await supabase.auth.getSession()).data.session;

    if (!activeSession?.access_token) return {};

    return { Authorization: `Bearer ${activeSession.access_token}` };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message === "Invalid login credentials" ? "邮箱或密码不正确。" : error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(data.session ? "注册成功，已登录。" : "注册成功，请查收邮箱并完成确认。");
  }, []);

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
