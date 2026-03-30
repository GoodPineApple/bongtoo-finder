"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KakaoMap } from "@/components/KakaoMap";
import { BottomSheet } from "@/components/BottomSheet";
import { DEMO_STORES } from "@/lib/demo-stores";
import { getCurrentUserPosition, resolveInitialMapArea } from "@/lib/user-area";
import type { ReportRow, StoreRow } from "@/lib/types";
import {
  MARKER_COLORS,
  MARKER_LABEL,
  MARKER_LEGEND_ORDER,
  STATUS_GUIDE,
  type MarkerStatus,
  type ReportRow as StatusReport,
} from "@/lib/marker-status";
import type { ViewBounds } from "@/lib/store-bounds";

function groupReports(rows: Pick<ReportRow, "store_id" | "is_available" | "created_at">[]): Record<
  string,
  StatusReport[]
> {
  const map: Record<string, StatusReport[]> = {};
  for (const r of rows) {
    if (!map[r.store_id]) map[r.store_id] = [];
    map[r.store_id].push({ is_available: r.is_available, created_at: r.created_at });
  }
  return map;
}

async function fetchStoresInBounds(b: ViewBounds): Promise<StoreRow[]> {
  const q = new URLSearchParams({
    minLat: String(b.minLat),
    maxLat: String(b.maxLat),
    minLng: String(b.minLng),
    maxLng: String(b.maxLng),
    limit: "2000",
  });
  const res = await fetch(`/api/stores?${q}`);
  const json = (await res.json()) as { stores?: StoreRow[] };
  return json.stores ?? [];
}

async function fetchReportsForStores(storeIds: string[]): Promise<Record<string, StatusReport[]>> {
  if (storeIds.length === 0) return {};
  const res = await fetch("/api/reports");
  if (!res.ok) return {};
  const json = (await res.json()) as {
    reports?: { store_id: string; is_available: boolean; created_at: string }[];
  };
  const idSet = new Set(storeIds);
  const rows = (json.reports ?? []).filter((r) => idSet.has(r.store_id));
  return groupReports(rows);
}

type Props = {
  kakaoAppKey: string;
};

export function MapPageClient({ kakaoAppKey }: Props) {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [reportsByStoreId, setReportsByStoreId] = useState<Record<string, StatusReport[]>>({});
  const [selected, setSelected] = useState<StoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 지도 인스턴스 최초 생성용 — 이후 「내 위치」로 바꾸지 않음(지도 리마운트 방지) */
  const [bootstrapCenter, setBootstrapCenter] = useState<{ lat: number; lng: number } | null>(null);
  /** 파란 점·화면 맞춤 — GPS 허용 시 좌표, 「내 위치」로 갱신 */
  const [userAnchor, setUserAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const [mapFitNonce, setMapFitNonce] = useState(0);
  const usedGeolocationRef = useRef(false);
  const [locating, setLocating] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadStoresForBoundsRef = useRef<(b: ViewBounds) => Promise<StoreRow[]>>(async () => []);
  const storeIdsRef = useRef<string[]>([]);

  const refreshReports = useCallback(async (storeIds: string[]) => {
    storeIdsRef.current = storeIds;
    try {
      const next = await fetchReportsForStores(storeIds);
      setReportsByStoreId(next);
    } catch {
      setError("제보 목록을 불러오지 못했습니다.");
    }
  }, []);

  const loadStoresForBounds = useCallback(
    async (b: ViewBounds): Promise<StoreRow[]> => {
      try {
        const list = await fetchStoresInBounds(b);
        setError(null);
        setStores(list);
        if (list.length === 0) {
          setHint(
            "지도에 보이는 이 구간에는 등록된 판매소가 없습니다. 지도를 움직이거나 줌을 바꿔 보세요. 데이터가 없다면 `npm run build:stores`로 `public/data/stores.json`을 만드세요."
          );
        } else {
          setHint(
            usedGeolocationRef.current
              ? "지도에 보이는 영역 기준으로 판매소를 불러왔습니다. 이동·줌하면 해당 화면에 맞춰 다시 불러옵니다."
              : null
          );
        }
        await refreshReports(list.map((s) => s.id));
        return list;
      } catch {
        setError("판매소 목록을 불러오지 못했습니다. 서버·네트워크를 확인하세요.");
        setStores(DEMO_STORES);
        setHint("연결에 실패해 데모 지점만 표시합니다. 새로고침 후 다시 시도해 보세요.");
        await refreshReports(DEMO_STORES.map((s) => s.id));
        return DEMO_STORES;
      }
    },
    [refreshReports]
  );

  loadStoresForBoundsRef.current = loadStoresForBounds;

  const onViewportBoundsChange = useCallback(
    (b: ViewBounds) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void loadStoresForBounds(b);
      }, 320);
    },
    [loadStoresForBounds]
  );

  const goToMyLocation = useCallback(async () => {
    setLocating(true);
    setHint(null);
    try {
      const pos = await getCurrentUserPosition();
      if (!pos) {
        return;
      }
      usedGeolocationRef.current = true;
      setUserAnchor(pos);
      setMapFitNonce((n) => n + 1);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function init() {
      setLoading(true);
      setError(null);
      setHint(null);

      const { center, usedGeolocation } = await resolveInitialMapArea();
      if (!alive) return;
      usedGeolocationRef.current = usedGeolocation;
      setBootstrapCenter(center);
      setUserAnchor(usedGeolocation ? center : null);
      setStores([]);
      setHint(null);
      if (alive) setLoading(false);
    }

    void init();
    return () => {
      alive = false;
    };
  }, [refreshReports]);

  useEffect(() => {
    const ids = stores.map((s) => s.id);
    if (ids.length === 0) return;
    const t = window.setInterval(() => {
      void refreshReports(ids);
    }, 25000);
    return () => window.clearInterval(t);
  }, [stores, refreshReports]);

  const onReport = async (isAvailable: boolean) => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: selected.id, is_available: isAvailable }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "제보 저장에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      await refreshReports(storeIdsRef.current);
    } catch {
      setError("제보 저장에 실패했습니다.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="z-10 shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-base font-bold text-slate-900">봉투어디</h1>
        <ul
          className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 text-[11px] text-slate-700"
          aria-label="지도 마커 색 설명"
        >
          {MARKER_LEGEND_ORDER.map((key: MarkerStatus) => (
            <li key={key} className="flex gap-2">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: MARKER_COLORS[key] }}
                aria-hidden
              />
              <span>
                <span className="font-semibold text-slate-800">{MARKER_LABEL[key]}</span>
                <span className="mt-0.5 block text-slate-500 leading-snug">{STATUS_GUIDE[key]}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          판매소 위치는 공공데이터를 기준으로 하며, 이용자 재고 제보에 따라 마커 색이 바뀝니다. 6시간이 지난 제보는
          반영되지 않을 수 있습니다.
        </p>
        {!loading && bootstrapCenter && !userAnchor ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900 ring-1 ring-amber-200/80">
            위치정보 확인이 필요합니다.
          </p>
        ) : null}
        {hint ? (
          <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-700">{hint}</p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800">{error}</p>
        ) : null}
      </header>

      <main className="relative flex min-h-[50vh] flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-slate-100 text-sm text-slate-600">
            위치와 판매소 정보를 불러오는 중…
          </div>
        ) : kakaoAppKey && bootstrapCenter ? (
          <div className="absolute inset-0 flex min-h-[280px] flex-col">
            <KakaoMap
              appKey={kakaoAppKey}
              initialCenter={bootstrapCenter}
              userAnchor={userAnchor}
              mapFitNonce={mapFitNonce}
              stores={stores}
              reportsByStoreId={reportsByStoreId}
              selectedId={selected?.id ?? null}
              onSelectStore={setSelected}
              onViewportBoundsChange={onViewportBoundsChange}
            />
            <button
              type="button"
              onClick={() => void goToMyLocation()}
              disabled={locating}
              className="absolute right-3 top-3 z-20 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-md ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              {locating ? "위치 확인 중…" : "내 위치"}
            </button>
          </div>
        ) : !kakaoAppKey ? (
          <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-2 bg-slate-100 px-6 text-center text-sm text-slate-700">
            <p className="font-medium">카카오맵 앱 키가 없습니다.</p>
            <p className="text-xs text-slate-500">
              `.env.local`에 NEXT_PUBLIC_KAKAO_MAP_APP_KEY 를 넣고 서버를 다시 시작하세요. 포트가 3002라면 카카오
              플랫폼에 <code className="rounded bg-white px-1">http://localhost:3002</code> 도 등록해야 지도가 보입니다.
            </p>
          </div>
        ) : null}
      </main>

      {selected ? (
        <BottomSheet
          store={selected}
          reports={reportsByStoreId[selected.id] ?? []}
          submitting={submitting}
          onClose={() => setSelected(null)}
          onReport={onReport}
        />
      ) : null}
    </div>
  );
}
