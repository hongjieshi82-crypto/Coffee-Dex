import { NextRequest, NextResponse } from "next/server";
import {
  createLocalQrLogin,
  getLocalRequestUser,
  redeemLocalQrLogin,
} from "@/local-auth";
import { createSupabaseQrTicket, readSupabaseQrTicket } from "@/qr-auth";
import {
  getRequestUser,
  getSupabaseAdmin,
  isSupabaseAuthConfigured,
} from "@/supabase-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (isSupabaseAuthConfigured()) {
      const user = await getRequestUser(request);
      const supabase = getSupabaseAdmin();

      if (!user?.email || !supabase) {
        return NextResponse.json({ error: "请先在电脑端登录。" }, { status: 401 });
      }

      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
      });

      if (error || !data.properties?.hashed_token) {
        console.warn("[Coffee-Dex] Failed to create Supabase QR login:", error);
        return NextResponse.json({ error: "二维码授权生成失败，请稍后刷新。" }, { status: 500 });
      }

      return NextResponse.json(createSupabaseQrTicket(data.properties.hashed_token));
    }

    const user = await getLocalRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "请先在电脑端登录。" }, { status: 401 });
    }

    return NextResponse.json(await createLocalQrLogin(user.id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "二维码授权生成失败，请稍后刷新。" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ticket = typeof body?.ticket === "string" ? body.ticket : "";

  if (!ticket) {
    return NextResponse.json({ error: "缺少扫码登录凭证。" }, { status: 400 });
  }

  try {
    if (ticket.startsWith("s.")) {
      if (!isSupabaseAuthConfigured()) {
        return NextResponse.json({ error: "扫码登录方式与当前环境不匹配。" }, { status: 400 });
      }

      const payload = readSupabaseQrTicket(ticket);
      const supabase = getSupabaseAdmin();

      if (!payload || !supabase) {
        return NextResponse.json(
          { error: "二维码已使用或已过期，请刷新电脑端二维码后重试。" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: payload.tokenHash,
        type: "magiclink",
      });

      if (error || !data.session || !data.user) {
        return NextResponse.json(
          { error: "二维码已使用或已过期，请刷新电脑端二维码后重试。" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        authMode: "supabase",
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email },
      });
    }

    if (!ticket.startsWith("l.") || isSupabaseAuthConfigured()) {
      return NextResponse.json({ error: "扫码登录方式与当前环境不匹配。" }, { status: 400 });
    }

    const session = await redeemLocalQrLogin(ticket);

    return NextResponse.json({ authMode: "local", ...session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "扫码登录失败，请重试。" },
      { status: 400 }
    );
  }
}
