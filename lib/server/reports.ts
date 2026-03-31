import {
  addReportRedis,
  isReportsRedisConfigured,
  listReportsRedis,
} from "@/lib/server/reports-redis";

export type { StoredReport } from "@/lib/server/reports-shared";

/** Redis 미설정 시 POST /api/reports → 503 */
export class ReportsStorageNotConfiguredError extends Error {
  constructor() {
    super(
      "제보 저장에 Redis가 필요합니다. Vercel KV 연결 시 자동으로 붙는 KV_REST_API_URL·KV_REST_API_TOKEN, 또는 Upstash의 UPSTASH_REDIS_REST_URL·UPSTASH_REDIS_REST_TOKEN을 설정하세요. 로컬은 .env.local에 동일한 키로 복사하면 됩니다."
    );
    this.name = "ReportsStorageNotConfiguredError";
  }
}

export async function listReports(filter?: { storeIds?: Set<string> }) {
  if (!isReportsRedisConfigured()) return [];
  return listReportsRedis(filter);
}

export async function addReport(input: { store_id: string; is_available: boolean }) {
  if (!isReportsRedisConfigured()) throw new ReportsStorageNotConfiguredError();
  return addReportRedis(input);
}
