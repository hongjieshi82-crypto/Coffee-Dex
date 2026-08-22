import { NextRequest, NextResponse } from "next/server";
import { getLocalRequestUser } from "@/local-auth";
import { getRequestUser, isSupabaseAuthConfigured } from "@/supabase-server";
import { decodeSourceImageDataUrl, MAX_SOURCE_IMAGE_DATA_URL_LENGTH } from "@/image-data-url";
import { readJsonWithLimit } from "@/server-json";

export const runtime = "nodejs";
export const maxDuration = 40;

const maxRecognitionRequestBytes = MAX_SOURCE_IMAGE_DATA_URL_LENGTH + 8 * 1024;

interface RecognitionResult {
  isDrink: boolean;
  confidence: number;
  vessel: string | null;
  drinkType: string | null;
  drinkName: string | null;
  reason: string;
  provider: "openai" | "manual";
  allowManualConfirm: boolean;
  failureCode?: RecognitionFailureCode;
}

type RecognitionFailureCode =
  | "not_configured"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_rejected"
  | "provider_invalid_response"
  | "provider_network_error";

class RecognitionProviderError extends Error {
  constructor(
    message: string,
    readonly code: RecognitionFailureCode,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "RecognitionProviderError";
  }
}

const recognitionAttemptTimeoutMs = getBoundedTimeout(
  process.env.OPENAI_RECOGNITION_TIMEOUT_MS,
  12_000
);
const recognitionMaxAttempts = 2;

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

  const bodyResult = await readJsonWithLimit(request, maxRecognitionRequestBytes);

  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error === "too-large" ? "上传图片过大，请换一张照片后重试。" : "请求内容不合法。" },
      { status: bodyResult.error === "too-large" ? 413 : 400 }
    );
  }

  const body = bodyResult.value as Record<string, unknown> | null;
  const sourceImage = body && typeof body === "object" && !Array.isArray(body)
    ? decodeSourceImageDataUrl(body.imageData)
    : null;

  if (!sourceImage) {
    return NextResponse.json({ error: "图片必须是不超过 4 MB 的 JPEG、PNG 或 WebP 文件。" }, { status: 400 });
  }

  const imageData = sourceImage.dataUrl;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(createManualResult(
      "AI 识别服务未连接，当前可人工确认后继续录入。",
      "not_configured"
    ));
  }

  let failure = new RecognitionProviderError(
    "AI 识别服务暂时不可用。",
    "provider_unavailable",
    true
  );

  for (let attempt = 1; attempt <= recognitionMaxAttempts; attempt += 1) {
    try {
      const parsed = await requestRecognition(imageData);
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
      failure = normalizeProviderError(error);
      console.warn(
        `[Coffee-Dex] Recognition attempt ${attempt}/${recognitionMaxAttempts} failed:`,
        failure.code,
        failure.message
      );

      if (!failure.retryable || attempt === recognitionMaxAttempts) break;

      await delay(350 * attempt);
    }
  }

  return NextResponse.json(createManualResult(
    getFailureReason(failure.code),
    failure.code
  ));
}

async function requestRecognition(imageData: string) {
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), recognitionAttemptTimeoutMs);
  let result: Response;

  try {
    result = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RecognitionProviderError(
        `视觉模型在 ${recognitionAttemptTimeoutMs}ms 内没有返回。`,
        "provider_timeout",
        true
      );
    }

    throw new RecognitionProviderError(
      error instanceof Error ? error.message : "无法连接视觉模型。",
      "provider_network_error",
      true
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!result.ok) {
    const errorText = (await result.text()).slice(0, 500);
    const retryable = result.status === 408 || result.status === 429 || result.status >= 500;
    const code: RecognitionFailureCode = result.status === 429
      ? "provider_rate_limited"
      : result.status >= 500 || result.status === 408
        ? "provider_unavailable"
        : "provider_rejected";

    throw new RecognitionProviderError(
      `视觉模型返回 ${result.status}${errorText ? `：${errorText}` : ""}`,
      code,
      retryable
    );
  }

  try {
    const data = await result.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("视觉模型没有返回识别内容。");
    }

    return parseRecognitionJson(content);
  } catch (error) {
    throw new RecognitionProviderError(
      error instanceof Error ? error.message : "视觉模型返回格式不正确。",
      "provider_invalid_response",
      true
    );
  }
}

function createManualResult(reason: string, failureCode: RecognitionFailureCode): RecognitionResult {
  return {
    isDrink: true,
    confidence: 0,
    vessel: null,
    drinkType: null,
    drinkName: null,
    reason,
    provider: "manual",
    allowManualConfirm: true,
    failureCode,
  };
}

function normalizeProviderError(error: unknown) {
  if (error instanceof RecognitionProviderError) return error;

  return new RecognitionProviderError(
    error instanceof Error ? error.message : "AI 识别发生未知错误。",
    "provider_unavailable",
    true
  );
}

function getFailureReason(code: RecognitionFailureCode) {
  if (code === "provider_timeout") return "视觉模型响应超时，已自动重试，仍未完成识别。你可以再次识别或人工确认。";
  if (code === "provider_rate_limited") return "AI 服务当前请求较多，已自动重试。你可以稍后再次识别或人工确认。";
  if (code === "provider_network_error") return "服务器暂时无法连接 AI 服务，已自动重试。你可以检查网络后再次识别。";
  if (code === "provider_rejected") return "AI 服务配置或请求参数异常，请检查模型配置后重试。";
  if (code === "provider_invalid_response") return "AI 返回内容格式异常，已自动重试。你可以再次识别或人工确认。";
  return "AI 识别服务暂时不可用，已自动重试。你可以稍后再次识别或人工确认。";
}

function getBoundedTimeout(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(5_000, Math.min(15_000, Math.round(parsed)));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRecognitionJson(content: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content) as unknown;

    return isRecord(parsed) ? parsed : {};
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start >= 0 && end > start) {
      const parsed = JSON.parse(content.slice(start, end + 1)) as unknown;

      return isRecord(parsed) ? parsed : {};
    }

    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
