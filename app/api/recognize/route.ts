import { NextRequest, NextResponse } from "next/server";
import { getLocalRequestUser } from "@/local-auth";
import { getRequestUser, isSupabaseAuthConfigured } from "@/supabase-server";

export const runtime = "nodejs";

interface RecognitionResult {
  isDrink: boolean;
  confidence: number;
  vessel: string | null;
  drinkType: string | null;
  drinkName: string | null;
  reason: string;
  provider: "openai" | "manual";
  allowManualConfirm: boolean;
}

const recognitionPrompt = `你是 Coffee-Dex 的图片饮品检测器。
只判断图片里是否有真实可饮用饮品或杯具，例如咖啡杯、纸杯、马克杯、玻璃杯、瓶装饮料、奶茶杯、茶杯。
如果只是菜单、截图、桌面、键盘、人物、空杯包装或没有饮品，请判定为 false。
如果能从杯身、包装、颜色、文字或饮品外观判断具体饮品，请尽量给出最具体的中文饮品名，例如：葡萄鲜切柠檬茶、生椰拿铁、冰美式、珍珠奶茶。
如果只能确定大类，请给出大类，例如：咖啡、奶茶、果茶、茶饮。不要编造看不出来的具体口味。
不要识别人脸、身份、地点等隐私信息。
只返回 JSON，不要 Markdown：
{
  "isDrink": boolean,
  "confidence": number,
  "vessel": string | null, // 必须使用简体中文，例如：纸杯、玻璃杯、马克杯、奶茶杯、瓶装饮料；不要英文
  "drinkType": string | null, // 必须使用简体中文，例如：咖啡、拿铁、美式、奶茶、茶饮、饮品；不要英文
  "drinkName": string | null, // 尽量具体的中文饮品名；无法判断时为 null
  "reason": string // 必须使用简体中文，不能出现英文短句
}`;

export async function POST(request: NextRequest) {
  const user = isSupabaseAuthConfigured() ? await getRequestUser(request) : await getLocalRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录后使用 AI 识别。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const imageData = body?.imageData;

  if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
    return NextResponse.json({ error: "缺少图片 data URL" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      isDrink: true,
      confidence: 0,
      vessel: null,
      drinkType: null,
      drinkName: null,
      reason: "AI 识别服务未连接，当前可人工确认后继续录入。",
      provider: "manual",
      allowManualConfirm: true,
    } satisfies RecognitionResult);
  }

  try {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const result = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: recognitionPrompt },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                  detail: "low",
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 320,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!result.ok) {
      const errorText = await result.text();
      console.warn("[Coffee-Dex] OpenAI recognition failed:", errorText);

      return NextResponse.json({
        isDrink: true,
        confidence: 0,
        vessel: null,
        drinkType: null,
        drinkName: null,
        reason: "AI 识别暂时不可用，已切换为人工确认。",
        provider: "manual",
        allowManualConfirm: true,
      } satisfies RecognitionResult);
    }

    const data = await result.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = parseRecognitionJson(content);
    const drinkName = toChineseRecognitionText(parsed.drinkName, null);
    const drinkType = toChineseRecognitionText(parsed.drinkType, null);

    return NextResponse.json({
      isDrink: Boolean(parsed.isDrink),
      confidence: clampConfidence(parsed.confidence),
      vessel: toChineseRecognitionText(parsed.vessel, null),
      drinkType,
      drinkName,
      reason: toChineseRecognitionText(parsed.reason, "AI 已完成识别。") ?? "AI 已完成识别。",
      provider: "openai",
      allowManualConfirm: true,
    } satisfies RecognitionResult);
  } catch (error) {
    console.warn("[Coffee-Dex] Recognition exception:", error);

    return NextResponse.json({
      isDrink: true,
      confidence: 0,
      vessel: null,
      drinkType: null,
      drinkName: null,
      reason: "AI 识别请求失败，已切换为人工确认。",
      provider: "manual",
      allowManualConfirm: true,
    } satisfies RecognitionResult);
  }
}

function parseRecognitionJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }

    return {};
  }
}

function clampConfidence(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(1, number));
}

function toChineseRecognitionText(value: unknown, fallback: string | null) {
  if (typeof value !== "string") return fallback;

  const text = value.trim();

  if (!text) return fallback;

  const normalized = text.toLowerCase();
  const phraseMap: Record<string, string> = {
    "paper cup": "纸杯",
    "plastic cup": "塑料杯",
    "glass cup": "玻璃杯",
    "coffee cup": "咖啡杯",
    "tea cup": "茶杯",
    cup: "杯子",
    glass: "玻璃杯",
    mug: "马克杯",
    bottle: "瓶装饮料",
    latte: "拿铁",
    americano: "美式",
    coffee: "咖啡",
    tea: "茶饮",
    milk: "牛奶",
    beverage: "饮品",
    drink: "饮品",
    "contains a drink": "照片中有饮品",
    "contains beverage": "照片中有饮品",
    "contains coffee": "照片中有咖啡饮品",
    "no drink": "未确认有饮品",
    "not a drink": "未确认有饮品",
  };

  if (phraseMap[normalized]) return phraseMap[normalized];

  return text.replace(/[A-Za-z][A-Za-z\s-]*/g, (match) => phraseMap[match.trim().toLowerCase()] ?? "饮品");
}
