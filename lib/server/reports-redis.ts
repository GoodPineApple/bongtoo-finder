import { Redis } from "@upstash/redis";
import { pruneReports, type StoredReport } from "@/lib/server/reports-shared";

const KEY = "bongtoo-finter:reports:v1";

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}

function redis(): Redis {
  return Redis.fromEnv();
}

function parseList(raw: unknown): StoredReport[] {
  if (Array.isArray(raw)) return raw as StoredReport[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as StoredReport[];
    } catch {
      return [];
    }
  }
  return [];
}

async function loadPrunePersist(): Promise<StoredReport[]> {
  const r = redis();
  const raw = await r.get(KEY);
  let list = parseList(raw);
  const pruned = pruneReports(list);
  if (pruned.length !== list.length) {
    await r.set(KEY, JSON.stringify(pruned));
  }
  return pruned;
}

export async function listReportsRedis(filter?: { storeIds?: Set<string> }): Promise<StoredReport[]> {
  return withLock(async () => {
    const all = await loadPrunePersist();
    if (filter?.storeIds && filter.storeIds.size > 0) {
      return all.filter((r) => filter.storeIds!.has(r.store_id));
    }
    return all;
  });
}

export async function addReportRedis(input: {
  store_id: string;
  is_available: boolean;
}): Promise<StoredReport> {
  return withLock(async () => {
    const list = await loadPrunePersist();
    const row: StoredReport = {
      id: crypto.randomUUID(),
      store_id: input.store_id,
      is_available: input.is_available,
      created_at: new Date().toISOString(),
    };
    list.push(row);
    await redis().set(KEY, JSON.stringify(list));
    return row;
  });
}
