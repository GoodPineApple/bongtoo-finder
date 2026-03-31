import { addReportLocal, listReportsLocal } from "@/lib/server/reports-local-disk";

export type { StoredReport } from "@/lib/server/reports-shared";

/**
 * 제보는 DB 없이 `data/reports.json`에만 저장합니다.
 * `next dev` / `next start` 등 로컬·단일 서버 환경을 가정합니다.
 */
export async function listReports(filter?: { storeIds?: Set<string> }) {
  return listReportsLocal(filter);
}

export async function addReport(input: { store_id: string; is_available: boolean }) {
  return addReportLocal(input);
}
