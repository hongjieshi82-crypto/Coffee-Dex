import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";
import { CoffeeRecord } from "@/coffee-data";

interface RecordState {
  records: CoffeeRecord[];
  updatedAt: number;
}

const storePath = path.join(process.cwd(), "data", "coffee-records.json");
const userStoreRoot = path.join(process.cwd(), "data", "users");
const cache = new Map<string, RecordState>();

async function readState(userId?: string): Promise<RecordState> {
  const cacheKey = userId ?? "public";
  const cached = cache.get(cacheKey);
  const targetPath = getStorePath(userId);

  if (cached) return cached;

  try {
    const file = await fs.readFile(targetPath, "utf8");
    const parsed = JSON.parse(file) as RecordState;
    const state = {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };

    cache.set(cacheKey, state);
  } catch {
    const state = {
      records: [],
      updatedAt: Date.now(),
    };

    cache.set(cacheKey, state);
  }

  return cache.get(cacheKey)!;
}

async function writeState(state: RecordState, userId?: string) {
  const cacheKey = userId ?? "public";
  const targetPath = getStorePath(userId);

  cache.set(cacheKey, state);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(state, null, 2), "utf8");
}

export async function getRecordState(userId?: string) {
  const state = await readState(userId);

  return {
    records: [...state.records].sort((a, b) => b.timestamp - a.timestamp),
    updatedAt: state.updatedAt,
  };
}

export async function addRecord(record: CoffeeRecord, userId?: string) {
  const state = await readState(userId);
  const nextState = {
    records: [record, ...state.records],
    updatedAt: Date.now(),
  };

  await writeState(nextState, userId);

  return nextState;
}

export async function deleteRecord(id?: string | null, userId?: string) {
  const state = await readState(userId);
  const nextState = {
    records: id ? state.records.filter((record) => record.id !== id) : [],
    updatedAt: Date.now(),
  };

  await writeState(nextState, userId);

  return nextState;
}

function getStorePath(userId?: string) {
  if (!userId) return storePath;

  const safeUserId = crypto.createHash("sha256").update(userId).digest("hex").slice(0, 32);

  return path.join(userStoreRoot, safeUserId, "coffee-records.json");
}
