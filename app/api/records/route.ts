import { NextRequest, NextResponse } from "next/server";
import {
  CoffeeRecord,
  CURRENT_STICKER_VERSION,
  aiComments,
  coffeeTypeMap,
  getCaffeine,
  getRandomToxicQuote,
} from "@/coffee-data";
import { addRecord, deleteRecord, getRecordState, updateRecordSticker } from "@/record-store";
import {
  addSupabaseRecord,
  deleteSupabaseRecord,
  getSupabaseRecords,
  updateSupabaseRecordSticker,
} from "@/supabase-record-store";
import { getRequestUser, isSupabaseAuthConfigured } from "@/supabase-server";
import { getLocalRequestUser } from "@/local-auth";
import { decodeSourceImageDataUrl, MAX_SOURCE_IMAGE_DATA_URL_LENGTH } from "@/image-data-url";
import { readJsonWithLimit } from "@/server-json";

export const runtime = "nodejs";

const recordIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pngDataUrlPrefix = "data:image/png;base64,";
const maxStickerBytes = 5 * 1024 * 1024;
const maxStickerDataUrlLength = pngDataUrlPrefix.length + Math.ceil(maxStickerBytes / 3) * 4;
const maxStickerSide = 2048;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const maxRecordPostBytes = MAX_SOURCE_IMAGE_DATA_URL_LENGTH + maxStickerDataUrlLength + 64 * 1024;
const maxStickerPatchBytes = maxStickerDataUrlLength + 8 * 1024;

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

  const bodyResult = await readJsonWithLimit(request, maxRecordPostBytes);

  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error === "too-large" ? "上传图片过大，请换一张照片后重试。" : "请求内容不合法。" },
      { status: bodyResult.error === "too-large" ? 413 : 400 }
    );
  }

  const body = bodyResult.value as Record<string, unknown> | null;

  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.coffeeType !== "string") {
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

  const hasStickerData = body.stickerData !== undefined;
  const hasStickerVersion = body.stickerVersion !== undefined;

  if (hasStickerData !== hasStickerVersion) {
    return NextResponse.json({ error: "贴纸和贴纸版本必须同时提供。" }, { status: 400 });
  }

  let stickerData: string | undefined;
  let stickerVersion: number | undefined;

  if (hasStickerData) {
    if (body.stickerVersion !== CURRENT_STICKER_VERSION) {
      return NextResponse.json({ error: "贴纸生成版本已过期，请刷新页面后重试。" }, { status: 409 });
    }

    if (!isValidPngDataUrl(body.stickerData)) {
      return NextResponse.json({ error: "贴纸必须是不超过 5 MB 的有效 PNG 图片。" }, { status: 400 });
    }

    stickerData = body.stickerData;
    stickerVersion = body.stickerVersion;
  }

  const hasImageData = body.imageData !== undefined;
  const sourceImage = hasImageData ? decodeSourceImageDataUrl(body.imageData) : null;

  if (hasImageData && !sourceImage) {
    return NextResponse.json({ error: "原图必须是不超过 4 MB 的 JPEG、PNG 或 WebP 图片。" }, { status: 400 });
  }

  const timestamp = Date.now();
  const record: CoffeeRecord = {
    id: crypto.randomUUID(),
    coffeeType: coffee.id,
    coffeeName: typeof body.coffeeName === "string" && body.coffeeName.trim() ? body.coffeeName.trim() : coffee.name,
    categoryId: coffee.categoryId,
    volumeMl: Math.round(volumeMl),
    imageData: sourceImage?.dataUrl,
    stickerData,
    stickerVersion,
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

export async function PATCH(request: NextRequest) {
  const supabaseAuthEnabled = isSupabaseAuthConfigured();
  const user = supabaseAuthEnabled ? await getRequestUser(request) : await getLocalRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录后更新贴纸。" }, { status: 401 });
  }

  const bodyResult = await readJsonWithLimit(request, maxStickerPatchBytes);

  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error === "too-large" ? "贴纸文件过大。" : "请求内容不合法。" },
      { status: bodyResult.error === "too-large" ? 413 : 400 }
    );
  }

  const body = bodyResult.value;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "请求内容不合法。" }, { status: 400 });
  }

  const { id, stickerData, stickerVersion } = body as {
    id?: unknown;
    stickerData?: unknown;
    stickerVersion?: unknown;
  };
  const fields = Object.keys(body);

  if (
    fields.length !== 3 ||
    !fields.includes("id") ||
    !fields.includes("stickerData") ||
    !fields.includes("stickerVersion")
  ) {
    return NextResponse.json({ error: "请求内容只能包含记录 ID、贴纸和贴纸版本。" }, { status: 400 });
  }

  if (typeof id !== "string" || !recordIdPattern.test(id)) {
    return NextResponse.json({ error: "记录 ID 不合法。" }, { status: 400 });
  }

  if (stickerVersion !== CURRENT_STICKER_VERSION) {
    return NextResponse.json({ error: "贴纸生成版本已过期，请刷新页面后重试。" }, { status: 409 });
  }

  if (!isValidPngDataUrl(stickerData)) {
    return NextResponse.json({ error: "贴纸必须是不超过 5 MB 的有效 PNG 图片。" }, { status: 400 });
  }

  if (supabaseAuthEnabled) {
    try {
      const record = await updateSupabaseRecordSticker(user.id, id, stickerData, stickerVersion);

      if (!record) {
        return NextResponse.json({ error: "没有找到这条记录。" }, { status: 404 });
      }

      return NextResponse.json({ record, updatedAt: Date.now() });
    } catch (error) {
      console.warn("[Coffee-Dex] Supabase records PATCH failed:", error);

      return NextResponse.json({ error: "线上贴纸保存失败，请稍后重试。" }, { status: 500 });
    }
  }

  const result = await updateRecordSticker(id, stickerData, stickerVersion, user.id);

  if (!result) {
    return NextResponse.json({ error: "没有找到这条记录。" }, { status: 404 });
  }

  return NextResponse.json(result);
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

function isValidPngDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > maxStickerDataUrlLength) return false;
  if (!value.startsWith(pngDataUrlPrefix)) return false;

  const encoded = value.slice(pngDataUrlPrefix.length);

  if (!encoded || encoded.length % 4 !== 0) return false;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    return false;
  }

  const image = Buffer.from(encoded, "base64");

  if (image.length > maxStickerBytes || image.toString("base64") !== encoded) return false;
  if (image.length < 45 || !image.subarray(0, pngSignature.length).equals(pngSignature)) return false;

  let offset = pngSignature.length;
  let sawHeader = false;
  let sawImageData = false;

  while (offset + 12 <= image.length) {
    const chunkLength = image.readUInt32BE(offset);
    const chunkType = image.toString("ascii", offset + 4, offset + 8);
    const chunkEnd = offset + 12 + chunkLength;

    if (chunkEnd > image.length) return false;

    if (!sawHeader) {
      if (chunkType !== "IHDR" || chunkLength !== 13) return false;

      const width = image.readUInt32BE(offset + 8);
      const height = image.readUInt32BE(offset + 12);

      if (width < 1 || height < 1 || width > maxStickerSide || height > maxStickerSide) return false;
      sawHeader = true;
    } else if (chunkType === "IHDR") {
      return false;
    }

    if (chunkType === "IDAT") sawImageData = true;
    if (chunkType === "IEND") {
      return chunkLength === 0 && sawHeader && sawImageData && chunkEnd === image.length;
    }

    offset = chunkEnd;
  }

  return false;
}
