/**
 * 기획서 §3 마커 색상 판정 (MVP: 클라이언트에서 최근 제보 목록으로 계산)
 */
export type MarkerStatus = "in_stock" | "uncertain" | "out_of_stock" | "unknown";

export const MARKER_COLORS: Record<MarkerStatus, string> = {
  in_stock: "#22C55E",
  uncertain: "#EAB308",
  out_of_stock: "#EF4444",
  unknown: "#94A3B8",
};

export const STATUS_GUIDE: Record<MarkerStatus, string> = {
  in_stock: "현재 재고가 확인되었습니다.",
  uncertain: "재고가 소진 중일 수 있습니다.",
  out_of_stock: "현재 품절 상태입니다.",
  unknown: "첫 번째 제보를 남겨주세요.",
};

/** 상단 범례 등 UI용 짧은 이름 */
export const MARKER_LABEL: Record<MarkerStatus, string> = {
  in_stock: "재고 있음",
  uncertain: "불확실",
  out_of_stock: "품절",
  unknown: "제보 없음",
};

export const MARKER_LEGEND_ORDER: MarkerStatus[] = [
  "in_stock",
  "uncertain",
  "out_of_stock",
  "unknown",
];

export type ReportRow = {
  is_available: boolean;
  created_at: string;
};

const MS = 1000;
const MIN = 60 * MS;
const HOUR = 60 * MIN;

export function computeMarkerStatus(reports: ReportRow[]): MarkerStatus {
  if (!reports.length) return "unknown";

  const now = Date.now();
  const sorted = [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const lastT = new Date(sorted[0].created_at).getTime();
  const hoursSinceLast = (now - lastT) / HOUR;

  if (hoursSinceLast >= 6) return "unknown";

  const in30m = sorted.filter((r) => now - new Date(r.created_at).getTime() <= 30 * MIN);
  if (in30m.some((r) => !r.is_available)) return "out_of_stock";

  if (hoursSinceLast >= 3) return "uncertain";

  const in1h = sorted.filter((r) => now - new Date(r.created_at).getTime() <= HOUR);
  if (!in1h.length) return "uncertain";

  let avail = 0;
  let sold = 0;
  for (const r of in1h) {
    if (r.is_available) avail += 1;
    else sold += 1;
  }
  if (sold === 0) return "in_stock";
  if (avail > sold) return "in_stock";
  if (sold > avail) return "uncertain";
  return "uncertain";
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "제보 없음";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}
