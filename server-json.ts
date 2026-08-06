import "server-only";

export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: "invalid" | "too-large" };

export async function readJsonWithLimit(request: Request, maxBytes: number): Promise<LimitedJsonResult> {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength !== null) {
    const bytes = Number(declaredLength);

    if (!Number.isSafeInteger(bytes) || bytes < 0) return { ok: false, error: "invalid" };
    if (bytes > maxBytes) return { ok: false, error: "too-large" };
  }

  if (!request.body) return { ok: false, error: "invalid" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let receivedBytes = 0;
  let json = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, error: "too-large" };
      }

      json += decoder.decode(value, { stream: true });
    }

    json += decoder.decode();
    return { ok: true, value: JSON.parse(json) };
  } catch {
    return { ok: false, error: "invalid" };
  }
}
