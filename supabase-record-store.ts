import { CoffeeRecord, CURRENT_STICKER_VERSION } from "@/coffee-data";
import { getSupabaseAdmin } from "@/supabase-server";

const storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? "coffee-photos";

interface CoffeeRecordRow {
  id: string;
  user_id: string;
  coffee_type: string;
  coffee_name: string;
  category_id: string;
  volume_ml: number;
  image_url: string | null;
  image_path: string | null;
  sticker_url: string | null;
  sticker_path: string | null;
  image_data?: string | null;
  caffeine: number;
  temp: string | null;
  sugar: string | null;
  ai_comment: string;
  toxic_quote: string;
  timestamp: number;
}

export async function getSupabaseRecords(userId: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("coffee_records")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as CoffeeRecordRow[]).map(mapRecordRow);
}

export async function addSupabaseRecord(userId: string, record: CoffeeRecord) {
  const supabase = requireSupabaseAdmin();
  const image = record.imageData?.startsWith("data:image/")
    ? await uploadRecordImage(userId, record.id, record.imageData)
    : { imageUrl: record.imageData ?? null, imagePath: null };
  const sticker = record.stickerData?.startsWith("data:image/")
    ? await uploadRecordImage(userId, `${record.id}-sticker-v${CURRENT_STICKER_VERSION}`, record.stickerData)
    : { imageUrl: record.stickerData ?? null, imagePath: null };

  const { data, error } = await supabase
    .from("coffee_records")
    .insert({
      id: record.id,
      user_id: userId,
      coffee_type: record.coffeeType,
      coffee_name: record.coffeeName,
      category_id: record.categoryId,
      volume_ml: record.volumeMl,
      image_url: image.imageUrl,
      image_path: image.imagePath,
      sticker_url: sticker.imageUrl,
      sticker_path: sticker.imagePath,
      caffeine: record.caffeine,
      temp: record.temp ?? null,
      sugar: record.sugar ?? null,
      ai_comment: record.aiComment,
      toxic_quote: record.toxicQuote,
      timestamp: record.timestamp,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapRecordRow(data as CoffeeRecordRow);
}

export async function updateSupabaseRecordSticker(
  userId: string,
  id: string,
  stickerData: string,
  stickerVersion: number
) {
  const supabase = requireSupabaseAdmin();
  const { data: existing, error: findError } = await supabase
    .from("coffee_records")
    .select("id,sticker_path,sticker_url")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (findError) throw findError;
  if (!existing) return null;

  const oldStickerPath = existing.sticker_path ?? getStoragePathFromUrl(existing.sticker_url);
  const sticker = await uploadRecordImage(userId, `${id}-sticker-v${stickerVersion}`, stickerData);
  const { data, error } = await supabase
    .from("coffee_records")
    .update({
      sticker_url: sticker.imageUrl,
      sticker_path: sticker.imagePath,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (data && oldStickerPath !== sticker.imagePath && isStoragePathOwnedByUser(userId, oldStickerPath)) {
    const { error: cleanupError } = await supabase.storage.from(storageBucket).remove([oldStickerPath]);

    if (cleanupError) {
      console.warn("[Coffee-Dex] Supabase old sticker cleanup failed:", cleanupError);
    }
  }

  return data ? mapRecordRow(data as CoffeeRecordRow) : null;
}

export async function updateSupabaseRecordToxicQuote(
  userId: string,
  id: string,
  toxicQuote: string
) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("coffee_records")
    .update({ toxic_quote: toxicQuote })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data ? mapRecordRow(data as CoffeeRecordRow) : null;
}

export async function deleteSupabaseRecord(userId: string, id?: string | null) {
  const supabase = requireSupabaseAdmin();

  if (!id) {
    const existing = await getSupabaseRecords(userId);
    const imagePaths = existing
      .flatMap((record) => [getStoragePathFromUrl(record.imageData), getStoragePathFromUrl(record.stickerData)])
      .filter((path): path is string => isStoragePathOwnedByUser(userId, path));

    await supabase.from("coffee_records").delete().eq("user_id", userId);
    if (imagePaths.length) await supabase.storage.from(storageBucket).remove(imagePaths);

    return getSupabaseRecords(userId);
  }

  const { data: existing } = await supabase
    .from("coffee_records")
    .select("image_path,image_url,sticker_path,sticker_url")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("coffee_records").delete().eq("user_id", userId).eq("id", id);

  if (error) throw error;

  const imagePaths = [
    existing?.image_path ?? getStoragePathFromUrl(existing?.image_url),
    existing?.sticker_path ?? getStoragePathFromUrl(existing?.sticker_url),
  ].filter((path): path is string => isStoragePathOwnedByUser(userId, path));
  if (imagePaths.length) await supabase.storage.from(storageBucket).remove(imagePaths);

  return getSupabaseRecords(userId);
}

function requireSupabaseAdmin() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase 服务端环境变量未配置。");
  }

  return supabase;
}

async function uploadRecordImage(userId: string, recordId: string, imageData: string) {
  const supabase = requireSupabaseAdmin();
  const { buffer, contentType, extension } = decodeDataUrl(imageData);
  const imagePath = `${userId}/${recordId}.${extension}`;
  const { error } = await supabase.storage.from(storageBucket).upload(imagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(imagePath);

  return {
    imageUrl: data.publicUrl,
    imagePath,
  };
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) throw new Error("图片格式不合法。");

  const contentType = match[1];
  const extension = mimeToExtension(contentType);

  return {
    buffer: Buffer.from(match[2], "base64"),
    contentType,
    extension,
  };
}

function mimeToExtension(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";

  return "jpg";
}

function mapRecordRow(row: CoffeeRecordRow): CoffeeRecord {
  return {
    id: row.id,
    coffeeType: row.coffee_type,
    coffeeName: row.coffee_name,
    categoryId: row.category_id,
    volumeMl: row.volume_ml,
    imageData: row.image_url ?? row.image_data ?? undefined,
    stickerData: row.sticker_url ?? undefined,
    stickerVersion: getStoredStickerVersion(row.sticker_url),
    caffeine: row.caffeine,
    temp: row.temp,
    sugar: row.sugar,
    aiComment: row.ai_comment,
    toxicQuote: row.toxic_quote,
    timestamp: row.timestamp,
  };
}

function getStoredStickerVersion(stickerUrl?: string | null) {
  if (!stickerUrl) return undefined;

  const match = stickerUrl.match(/-sticker-v(\d+)\.png(?:\?|$)/);
  return match ? Number(match[1]) : 1;
}

function getStoragePathFromUrl(value?: string | null) {
  if (!value) return null;

  const marker = `/storage/v1/object/public/${storageBucket}/`;
  const index = value.indexOf(marker);

  return index >= 0 ? decodeURIComponent(value.slice(index + marker.length)) : null;
}

function isStoragePathOwnedByUser(userId: string, path?: string | null): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`);
}
