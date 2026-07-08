import { NextRequest, NextResponse } from "next/server";
import {
  CoffeeRecord,
  aiComments,
  coffeeTypeMap,
  getCaffeine,
  getRandomToxicQuote,
} from "@/coffee-data";
import { addRecord, deleteRecord, getRecordState } from "@/record-store";
import { addSupabaseRecord, deleteSupabaseRecord, getSupabaseRecords } from "@/supabase-record-store";
import { getRequestUser, isSupabaseAuthConfigured } from "@/supabase-server";
import { getLocalRequestUser } from "@/local-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (isSupabaseAuthConfigured()) {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "请先登录后查看咖啡图鉴。", records: [] }, { status: 401 });
    }

    try {
      const records = await getSupabaseRecords(user.id);

      return NextResponse.json({
        records,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn("[Coffee-Dex] Supabase records GET failed:", error);

      return NextResponse.json({ error: "读取线上图鉴失败，请稍后重试。", records: [] }, { status: 500 });
    }
  }

  const user = await getLocalRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录后查看咖啡图鉴。", records: [] }, { status: 401 });
  }

  const store = await getRecordState(user.id);

  return NextResponse.json({
    records: store.records,
    updatedAt: store.updatedAt,
  });
}

export async function POST(request: NextRequest) {
  const supabaseAuthEnabled = isSupabaseAuthConfigured();
  const user = supabaseAuthEnabled ? await getRequestUser(request) : await getLocalRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录后录入咖啡。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.coffeeType !== "string") {
    return NextResponse.json({ error: "缺少咖啡类型" }, { status: 400 });
  }

  const coffee = coffeeTypeMap[body.coffeeType];

  if (!coffee) {
    return NextResponse.json({ error: "未知咖啡类型" }, { status: 400 });
  }

  const volumeMl = Number(body.volumeMl);

  if (!Number.isFinite(volumeMl) || volumeMl <= 0) {
    return NextResponse.json({ error: "容量不合法" }, { status: 400 });
  }

  const timestamp = Date.now();
  const record: CoffeeRecord = {
    id: crypto.randomUUID(),
    coffeeType: coffee.id,
    coffeeName: typeof body.coffeeName === "string" && body.coffeeName.trim() ? body.coffeeName.trim() : coffee.name,
    categoryId: coffee.categoryId,
    volumeMl: Math.round(volumeMl),
    imageData: typeof body.imageData === "string" ? body.imageData : undefined,
    caffeine: getCaffeine(coffee.id, volumeMl),
    temp: typeof body.temp === "string" ? body.temp : null,
    sugar: typeof body.sugar === "string" ? body.sugar : null,
    aiComment: aiComments[coffee.id] ?? "这杯咖啡没有多说什么，但你已经懂了。",
    toxicQuote: getRandomToxicQuote(timestamp),
    timestamp,
  };

  if (supabaseAuthEnabled) {
    try {
      const onlineRecord = await addSupabaseRecord(user.id, record);

      return NextResponse.json({ record: onlineRecord, updatedAt: Date.now() }, { status: 201 });
    } catch (error) {
      console.warn("[Coffee-Dex] Supabase records POST failed:", error);

      return NextResponse.json({ error: "线上图鉴保存失败，请稍后重试。" }, { status: 500 });
    }
  }

  const store = await addRecord(record, user.id);

  return NextResponse.json({ record, updatedAt: store.updatedAt }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (isSupabaseAuthConfigured()) {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "请先登录后删除记录。" }, { status: 401 });
    }

    try {
      const records = await deleteSupabaseRecord(user.id, id);

      return NextResponse.json({ records, updatedAt: Date.now() });
    } catch (error) {
      console.warn("[Coffee-Dex] Supabase records DELETE failed:", error);

      return NextResponse.json({ error: "删除线上记录失败，请稍后重试。" }, { status: 500 });
    }
  }

  const user = await getLocalRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录后删除记录。" }, { status: 401 });
  }

  const store = await deleteRecord(id, user.id);

  return NextResponse.json({ records: store.records, updatedAt: store.updatedAt });
}
