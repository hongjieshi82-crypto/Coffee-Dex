import { NextRequest } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function isSupabaseServerConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  if (!isSupabaseServerConfigured()) return null;

  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClient;
}

export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const supabase = getSupabaseAdmin();
  const token = getBearerToken(request);

  if (!supabase || !token) return null;

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}
