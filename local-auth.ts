import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";
import { NextRequest } from "next/server";
import { isEmailSenderConfigured, sendEmail } from "@/email-sender";

export interface LocalAuthUser {
  id: string;
  email: string;
}

interface LocalUserRecord extends LocalAuthUser {
  passwordHash: string;
  salt: string;
  createdAt: number;
  emailVerifiedAt?: number;
}

interface PendingSignupRecord {
  email: string;
  passwordHash: string;
  salt: string;
  codeHash: string;
  codeSalt: string;
  expiresAt: number;
  createdAt: number;
  sentAt: number;
}

interface LocalUserState {
  users: LocalUserRecord[];
  pendingSignups?: PendingSignupRecord[];
  updatedAt: number;
}

const usersPath = path.join(process.cwd(), "data", "local-users.json");
const tokenTtlMs = 30 * 24 * 60 * 60 * 1000;
const signupCodeTtlMs = 10 * 60 * 1000;
let cache: LocalUserState | null = null;

export async function startLocalSignUp(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  validateCredentials(normalizedEmail, password);

  const state = await readUserState();
  const existing = state.users.find((user) => user.email === normalizedEmail);

  if (existing) {
    throw new Error("这个邮箱已经注册，请直接登录。");
  }

  if (!isEmailSenderConfigured()) {
    return createLocalUser(normalizedEmail, password);
  }

  const { pending, code } = createPendingSignup(normalizedEmail, password);
  const pendingSignups = [
    pending,
    ...(state.pendingSignups ?? []).filter((item) => item.email !== normalizedEmail && item.expiresAt > Date.now()),
  ];

  await writeUserState({
    users: state.users,
    pendingSignups,
    updatedAt: Date.now(),
  });

  await sendSignupCode(normalizedEmail, code);

  return { verificationRequired: true };
}

export async function verifyLocalSignUp(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  const state = await readUserState();
  const pending = (state.pendingSignups ?? []).find((item) => item.email === normalizedEmail);

  if (!pending || pending.expiresAt < Date.now()) {
    throw new Error("验证码已过期，请重新注册。");
  }

  if (hashPassword(normalizedCode, pending.codeSalt) !== pending.codeHash) {
    throw new Error("验证码不正确。");
  }

  const existing = state.users.find((user) => user.email === normalizedEmail);

  if (existing) {
    throw new Error("这个邮箱已经注册，请直接登录。");
  }

  const user: LocalUserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: pending.passwordHash,
    salt: pending.salt,
    createdAt: Date.now(),
    emailVerifiedAt: Date.now(),
  };

  await writeUserState({
    users: [...state.users, user],
    pendingSignups: (state.pendingSignups ?? []).filter((item) => item.email !== normalizedEmail),
    updatedAt: Date.now(),
  });

  return createLocalSession(user);
}

export async function resendLocalSignUpCode(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!isEmailSenderConfigured()) {
    throw new Error(
      "当前测试环境还没有配置邮件发送服务，不能验证邮箱。请配置 Resend 或 SMTP 后再注册。"
    );
  }

  const state = await readUserState();
  const existing = state.users.find((user) => user.email === normalizedEmail);

  if (existing) {
    throw new Error("这个邮箱已经注册，请直接登录。");
  }

  const previous = (state.pendingSignups ?? []).find((item) => item.email === normalizedEmail);

  if (!previous || previous.expiresAt < Date.now()) {
    throw new Error("注册验证码已过期，请重新注册。");
  }

  const code = createVerificationCode();
  const codeSalt = crypto.randomBytes(16).toString("hex");
  const nextPending: PendingSignupRecord = {
    ...previous,
    codeHash: hashPassword(code, codeSalt),
    codeSalt,
    expiresAt: Date.now() + signupCodeTtlMs,
    sentAt: Date.now(),
  };

  await writeUserState({
    users: state.users,
    pendingSignups: [
      nextPending,
      ...(state.pendingSignups ?? []).filter((item) => item.email !== normalizedEmail && item.expiresAt > Date.now()),
    ],
    updatedAt: Date.now(),
  });

  await sendSignupCode(normalizedEmail, code);

  return { ok: true };
}

export async function createLocalUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  validateCredentials(normalizedEmail, password);

  const state = await readUserState();
  const existing = state.users.find((user) => user.email === normalizedEmail);

  if (existing) {
    throw new Error("这个邮箱已经注册，请直接登录。");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const user: LocalUserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: Date.now(),
    emailVerifiedAt: Date.now(),
  };

  await writeUserState({
    users: [...state.users, user],
    pendingSignups: (state.pendingSignups ?? []).filter((item) => item.email !== normalizedEmail),
    updatedAt: Date.now(),
  });

  return createLocalSession(user);
}

export async function signInLocalUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const state = await readUserState();
  const user = state.users.find((item) => item.email === normalizedEmail);

  if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
    throw new Error("邮箱或密码不正确。");
  }

  if (!user.emailVerifiedAt) {
    if (!isEmailSenderConfigured()) {
      const verifiedUser: LocalUserRecord = {
        ...user,
        emailVerifiedAt: Date.now(),
      };

      await writeUserState({
        ...state,
        users: state.users.map((item) => (item.id === verifiedUser.id ? verifiedUser : item)),
        updatedAt: Date.now(),
      });

      return createLocalSession(verifiedUser);
    }

    throw new Error("这个账号还没有完成邮箱验证。请配置邮件服务后重新注册或完成邮箱验证。");
  }

  return createLocalSession(user);
}

export async function getLocalRequestUser(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) return null;

  const tokenUser = verifyLocalToken(token);

  if (!tokenUser) return null;

  const state = await readUserState();
  const existing = state.users.find((user) => user.id === tokenUser.id && user.email === tokenUser.email);

  return existing ? tokenUser : null;
}

export function verifyLocalToken(token: string): LocalAuthUser | null {
  const [payloadPart, signature] = token.split(".");

  if (!payloadPart || !signature) return null;

  const expected = sign(payloadPart);

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      exp?: number;
    };

    if (!payload.sub || !payload.email || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

function createLocalSession(user: LocalUserRecord) {
  const publicUser: LocalAuthUser = {
    id: user.id,
    email: user.email,
  };
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      iat: Date.now(),
      exp: Date.now() + tokenTtlMs,
    })
  ).toString("base64url");

  return {
    user: publicUser,
    access_token: `${payload}.${sign(payload)}`,
  };
}

async function readUserState(): Promise<LocalUserState> {
  if (cache) return cache;

  try {
    const file = await fs.readFile(usersPath, "utf8");
    const parsed = JSON.parse(file) as LocalUserState;
    cache = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      pendingSignups: Array.isArray(parsed.pendingSignups)
        ? parsed.pendingSignups.filter((item) => item.expiresAt > Date.now())
        : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    cache = {
      users: [],
      pendingSignups: [],
      updatedAt: Date.now(),
    };
  }

  return cache;
}

async function writeUserState(state: LocalUserState) {
  cache = state;
  await fs.mkdir(path.dirname(usersPath), { recursive: true });
  await fs.writeFile(usersPath, JSON.stringify(state, null, 2), "utf8");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string) {
  if (!email.includes("@")) {
    throw new Error("请输入有效邮箱。");
  }

  if (password.length < 6) {
    throw new Error("密码至少需要 6 位。");
  }
}

function createPendingSignup(email: string, password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const code = createVerificationCode();
  const codeSalt = crypto.randomBytes(16).toString("hex");

  return {
    pending: {
      email,
      passwordHash: hashPassword(password, salt),
      salt,
      codeHash: hashPassword(code, codeSalt),
      codeSalt,
      expiresAt: Date.now() + signupCodeTtlMs,
      createdAt: Date.now(),
      sentAt: Date.now(),
    },
    code,
  };
}

function createVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendSignupCode(email: string, code: string) {
  await sendEmail({
    to: email,
    subject: "Coffee-Dex 邮箱验证码",
    text: `你的 Coffee-Dex 验证码是：${code}\n\n验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
  });
}

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
}

function sign(payloadPart: string) {
  return crypto.createHmac("sha256", getTokenSecret()).update(payloadPart).digest("base64url");
}

function getTokenSecret() {
  return (
    process.env.COFFEE_DEX_LOCAL_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "coffee-dex-local-auth-development-secret"
  );
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}
