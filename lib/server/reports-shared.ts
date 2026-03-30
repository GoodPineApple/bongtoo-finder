/** 기획서: 6시간 이상 지난 제보는 판정에서 사실상 제외 → 저장소에서도 제거 */
export const REPORT_RETENTION_MS = 6 * 60 * 60 * 1000;

export type StoredReport = {
  id: string;
  store_id: string;
  is_available: boolean;
  created_at: string;
};

export function pruneReports(list: StoredReport[]): StoredReport[] {
  const cutoff = Date.now() - REPORT_RETENTION_MS;
  return list.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}
