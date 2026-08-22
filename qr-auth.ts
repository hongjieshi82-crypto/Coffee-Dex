import crypto from "crypto";

const qrLoginTtlMs = 3 * 60 * 1000;

interface SupabaseQrPayload {
  version: 1;
  tokenHash: string;
  expiresAt: number;
}

export function createSupabaseQrTicket(tokenHash: string) {
  const expiresAt = Date.now() + qrLoginTtlMs;
  const payload = Buffer.from(
    JSON.stringify({ version: 1, tokenHash, expiresAt } satisfies SupabaseQrPayload)
  ).toString("base64url");

  return {
    ticket: `s.${payload}.${sign(payload)}`,
    expiresAt,
  };
}

export function readSupabaseQrTicket(ticket: string) {
  const [mode, payload, signature] = ticket.split(".");

  if (mode !== "s" || !payload || !signature) return null;

  const expected = sign(payload);

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<SupabaseQrPayload>;

    if (
      parsed.version !== 1 ||
      typeof parsed.tokenHash !== "string" ||
      !parsed.tokenHash ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < Date.now()
    ) {
      return null;
    }

    return parsed as SupabaseQrPayload;
  } catch {
    return null;
  }
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", getQrSecret())
    .update(payload)
    .digest("base64url");
}

function getQrSecret() {
  return (
    process.env.COFFEE_DEX_QR_AUTH_SECRET ??
    process.env.COFFEE_DEX_LOCAL_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "coffee-dex-qr-auth-development-secret"
  );
}
