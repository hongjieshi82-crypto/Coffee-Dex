import { NextResponse } from "next/server";
import { isSupabaseAuthConfigured, isSupabaseServerConfigured } from "@/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const clientConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serverConfigured = isSupabaseServerConfigured();

  return NextResponse.json({
    authEnabled: isSupabaseAuthConfigured(),
    clientConfigured,
    serverConfigured,
  });
}
