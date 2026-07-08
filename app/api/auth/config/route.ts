import { NextResponse } from "next/server";
import { isEmailSenderConfigured } from "@/email-sender";
import { isSupabaseAuthConfigured, isSupabaseServerConfigured } from "@/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const clientConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serverConfigured = isSupabaseServerConfigured();
  const supabaseAuthEnabled = isSupabaseAuthConfigured();

  return NextResponse.json({
    authEnabled: true,
    authMode: supabaseAuthEnabled ? "supabase" : "local",
    localEmailVerificationEnabled: supabaseAuthEnabled ? true : isEmailSenderConfigured(),
    clientConfigured,
    serverConfigured,
  });
}
