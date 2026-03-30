import { addReportLocal, listReportsLocal } from "@/lib/server/reports-local-disk";
import { addReportRedis, listReportsRedis } from "@/lib/server/reports-redis";

export type { StoredReport } from "@/lib/server/reports-shared";

/** Vercel 배포·`vercel dev` 등 — 디스크는 읽기 전용(EROFS)이라 파일 제보 저장 불가 */
function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Upstash Redis (Vercel → Storage → Redis 연결 시 `UPSTASH_*` 자동 주입)
 * 로컬 `next dev`만 쓸 때는 없어도 `data/reports.json`으로 동작합니다.
 */
function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Vercel에서 Redis 미연결 시 POST /api/reports가 이 에러를 던지면 503으로 응답합니다. */
export class ReportsRedisRequiredError extends Error {
  constructor() {
    super(
      "이 환경(Vercel)에서는 디스크에 제보를 저장할 수 없습니다. Vercel 프로젝트 → Storage → Marketplace에서 Redis(Upstash)를 만들고 이 프로젝트에 연결하세요. 연결 후 UPSTASH_REDIS_REST_URL·UPSTASH_REDIS_REST_TOKEN이 자동으로 붙습니다."
    );
    this.name = "ReportsRedisRequiredError";
  }
}

export async function listReports(filter?: { storeIds?: Set<string> }) {
  if (isRedisConfigured()) return listReportsRedis(filter);
  if (isVercelRuntime()) return [];
  return listReportsLocal(filter);
}

export async function addReport(input: { store_id: string; is_available: boolean }) {
  if (isRedisConfigured()) return addReportRedis(input);
  if (isVercelRuntime()) throw new ReportsRedisRequiredError();
  return addReportLocal(input);
}
