import { addReportLocal, listReportsLocal } from "@/lib/server/reports-local-disk";
import { addReportRedis, listReportsRedis } from "@/lib/server/reports-redis";

export type { StoredReport } from "@/lib/server/reports-shared";

/**
 * Upstash Redis (Vercel 대시보드 → Storage → Redis 생성 시 자동 주입)
 * 가 있으면 제보를 Redis에 저장하고, 없으면 `data/reports.json`을 사용합니다.
 * Vercel 서버리스에서는 파일 쓰기가 유지되지 않으므로 프로덕션에 Redis 연결을 권장합니다.
 */
function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function listReports(filter?: { storeIds?: Set<string> }) {
  if (isRedisConfigured()) return listReportsRedis(filter);
  return listReportsLocal(filter);
}

export async function addReport(input: { store_id: string; is_available: boolean }) {
  if (isRedisConfigured()) return addReportRedis(input);
  return addReportLocal(input);
}
