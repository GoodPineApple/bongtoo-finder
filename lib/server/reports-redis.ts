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

/**
 * Vercel Storage → KV 연결 시 자동 주입: `KV_REST_API_URL`, `KV_REST_API_TOKEN`
 * Upstash 단독/다른 호스트: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
 */
export function resolveRedisRestConfig(): { url: string; token: string } | null {
  const candidates: [string | undefined, string | undefined][] = [
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
  ];
  for (const [url, token] of candidates) {
    const u = url?.trim();
    const t = token?.trim();
    if (u && t) return { url: u, token: t };
  }
  return null;
}

export function isReportsRedisConfigured(): boolean {
  return resolveRedisRestConfig() !== null;
}

function redis(): Redis {
  const cfg = resolveRedisRestConfig();
  if (!cfg) {
    throw new Error("Redis REST URL/TOKEN이 없습니다. KV_REST_API_* 또는 UPSTASH_REDIS_REST_* 를 설정하세요.");
  }
  return new Redis({ url: cfg.url, token: cfg.token });
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
