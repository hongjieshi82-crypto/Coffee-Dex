import { promises as fs } from "fs";
import path from "path";
import { CoffeeRecord } from "@/coffee-data";

interface RecordState {
  records: CoffeeRecord[];
  updatedAt: number;
}

const storePath = path.join(process.cwd(), "data", "coffee-records.json");
let cache: RecordState | null = null;

async function readState(): Promise<RecordState> {
  if (cache) return cache;

  try {
    const file = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(file) as RecordState;
    cache = {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    cache = {
      records: [],
      updatedAt: Date.now(),
    };
  }

  return cache;
}

async function writeState(state: RecordState) {
  cache = state;
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(state, null, 2), "utf8");
}

export async function getRecordState() {
  const state = await readState();

  return {
    records: [...state.records].sort((a, b) => b.timestamp - a.timestamp),
    updatedAt: state.updatedAt,
  };
}

export async function addRecord(record: CoffeeRecord) {
  const state = await readState();
  const nextState = {
    records: [record, ...state.records],
    updatedAt: Date.now(),
  };

  await writeState(nextState);

  return nextState;
}

export async function deleteRecord(id?: string | null) {
  const state = await readState();
  const nextState = {
    records: id ? state.records.filter((record) => record.id !== id) : [],
    updatedAt: Date.now(),
  };

  await writeState(nextState);

  return nextState;
}
