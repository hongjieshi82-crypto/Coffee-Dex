import { NextRequest, NextResponse } from "next/server";
import {
  getLocalRequestUser,
  resendLocalSignUpCode,
  signInLocalUser,
  startLocalSignUp,
  verifyLocalSignUp,
} from "@/local-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getLocalRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录。", user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const code = typeof body?.code === "string" ? body.code : "";

  try {
    if (action === "signup") {
      return NextResponse.json(await startLocalSignUp(email, password));
    }

    if (action === "verify-signup") {
      return NextResponse.json(await verifyLocalSignUp(email, code));
    }

    if (action === "resend-signup") {
      return NextResponse.json(await resendLocalSignUpCode(email));
    }

    if (action === "signin") {
      return NextResponse.json(await signInLocalUser(email, password));
    }

    return NextResponse.json({ error: "未知登录操作。" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登录失败，请重试。" },
      { status: 400 }
    );
  }
}
