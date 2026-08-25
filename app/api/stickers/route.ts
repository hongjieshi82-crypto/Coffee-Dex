import { NextRequest, NextResponse } from "next/server";
import { CURRENT_STICKER_VERSION, hasUsableCurrentSticker } from "@/coffee-data";
import { getLocalRequestUser } from "@/local-auth";
import { getRecordState, updateRecordSticker } from "@/record-store";
import { createServerSticker } from "@/server-sticker";
import { getSupabaseRecords, updateSupabaseRecordSticker } from "@/supabase-record-store";
import { getRequestUser, isSupabaseAuthConfigured } from "@/supabase-server";
import { readJsonWithLimit } from "@/server-json";

export const runtime = "nodejs";
export const maxDuration = 60;

const recordIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabaseEnabled = isSupabaseAuthConfigured();
  const user = supabaseEnabled ? await getRequestUser(request) : await getLocalRequestUser(request);

  if (!user) return NextResponse.json({ error: "请先登录后生成贴纸。" }, { status: 401 });

  const bodyResult = await readJsonWithLimit(request, 8 * 1024);
  const body = bodyResult.ok ? bodyResult.value as Record<string, unknown> | null : null;
  const id = body && typeof body === "object" && !Array.isArray(body) ? body.id : null;

  if (typeof id !== "string" || !recordIdPattern.test(id)) {
    return NextResponse.json({ error: "记录 ID 不合法。" }, { status: 400 });
  }

  try {
    const records = supabaseEnabled
      ? await getSupabaseRecords(user.id)
      : (await getRecordState(user.id)).records;
    const record = records.find((current) => current.id === id);

    if (!record) return NextResponse.json({ error: "没有找到这条记录。" }, { status: 404 });
    if (hasUsableCurrentSticker(record)) return NextResponse.json({ record, reused: true });
    if (!record.imageData) return NextResponse.json({ error: "这条记录没有可处理的原图。" }, { status: 422 });

    const stickerData = await createServerSticker(record.imageData);
    const updated = supabaseEnabled
      ? await updateSupabaseRecordSticker(user.id, id, stickerData, CURRENT_STICKER_VERSION)
      : (await updateRecordSticker(id, stickerData, CURRENT_STICKER_VERSION, user.id))?.record;

    if (!updated) return NextResponse.json({ error: "贴纸保存失败。" }, { status: 500 });

    return NextResponse.json({ record: updated, reused: false });
  } catch (error) {
    console.warn("[Coffee-Dex] Server sticker generation failed:", error);
    return NextResponse.json({ error: "贴纸生成暂时失败，稍后会自动重试。" }, { status: 503 });
  }
}
