"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreRow } from "@/lib/types";
import {
  KAKAO_MAP_DEFAULT_LEVEL,
  KAKAO_MAP_MAX_LEVEL,
  KAKAO_MAP_MIN_LEVEL,
} from "@/lib/kakao-map-level";
import type { ViewBounds } from "@/lib/store-bounds";
import {
  MARKER_COLORS,
  computeMarkerStatus,
  type ReportRow as StatusReport,
} from "@/lib/marker-status";

type LatLngBoundsInstance = { extend: (latlng: unknown) => void };

type KakaoMapsNS = {
  maps: {
    load: (cb: () => void) => void;
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMapInstance;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => LatLngBoundsInstance;
    CustomOverlay: new (options: {
      map?: KakaoMapInstance;
      position: unknown;
      content: HTMLElement;
      yAnchor: number;
      xAnchor: number;
      clickable?: boolean;
    }) => { setMap: (m: KakaoMapInstance | null) => void };
    event: {
      addListener: (target: unknown, type: string, handler: () => void) => void;
      removeListener: (target: unknown, type: string, handler: () => void) => void;
    };
  };
};

interface KakaoMapInstance {
  setCenter: (latlng: unknown) => void;
  setLevel: (level: number) => void;
  getLevel: () => number;
  relayout: () => void;
  setBounds: (bounds: LatLngBoundsInstance) => void;
}

/** 브라우저 Console에서 "봉투어디 KakaoMap" 으로 검색하면 원인 추적에 쓸 로그만 모아볼 수 있습니다. */
function debugKakao(level: "error" | "warn" | "info", message: string, detail?: unknown) {
  if (typeof window === "undefined") return;
  const prefix = "[봉투어디 KakaoMap]";
  const origin = window.location.origin;
  const href = window.location.href;
  const base = { message, pageOrigin: origin, pageHref: href };
  const payload = detail !== undefined ? { ...base, detail } : base;
  if (level === "error") console.error(prefix, payload);
  else if (level === "warn") console.warn(prefix, payload);
  else console.info(prefix, payload);
}

function loadKakaoScript(appKey: string): Promise<KakaoMapsNS> {
  const key = appKey.trim();
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    if (!key) {
      reject(new Error("empty app key"));
      return;
    }
    const w = window as Window & { kakao?: KakaoMapsNS };
    if (w.kakao?.maps) {
      resolve(w.kakao);
      return;
    }
    const existing = document.querySelector('script[data-kakao-maps="1"]') as HTMLScriptElement | null;
    if (existing) {
      const runLoad = () => {
        const kakaoGlobal = w.kakao;
        if (!kakaoGlobal?.maps?.load) {
          debugKakao("error", "기존 스크립트: window.kakao.maps.load 없음", {
            hasKakao: !!w.kakao,
            kakaoKeys: w.kakao ? Object.keys(w.kakao as object) : [],
          });
          reject(
            new Error(
              "SDK 준비 실패: JavaScript SDK 도메인에 현재 페이지 출처(주소창 URL)를 등록했는지 확인하세요."
            )
          );
          return;
        }
        kakaoGlobal.maps.load(() => {
          if (w.kakao?.maps) resolve(w.kakao);
          else {
            debugKakao("error", "maps.load 콜백 후 window.kakao.maps 없음");
            reject(new Error("kakao maps.load failed"));
          }
        });
      };
      if (w.kakao?.maps?.load) {
        runLoad();
      } else {
        existing.addEventListener("load", runLoad, { once: true });
        existing.addEventListener(
          "error",
          () => {
            debugKakao("error", "기존 카카오 스크립트 태그 error 이벤트 (이전 로드 실패 태그 제거)");
            existing.remove();
            reject(new Error("kakao script error"));
          },
          { once: true }
        );
      }
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.dataset.kakaoMaps = "1";
    script.onload = () => {
      const kakaoGlobal = w.kakao;
      if (!kakaoGlobal?.maps?.load) {
        debugKakao("error", "sdk.js onload 후 window.kakao.maps.load 없음 (도메인/키 불일치일 때 흔함)", {
          hasWindowKakao: !!kakaoGlobal,
          typeofMaps: kakaoGlobal?.maps ? typeof kakaoGlobal.maps : "undefined",
        });
        reject(
          new Error(
            "Kakao SDK가 스크립트만 로드되고 maps.load를 쓸 수 없습니다. JavaScript 키·JavaScript SDK 도메인(현재 주소창 URL과 동일)을 확인하세요."
          )
        );
        return;
      }
      kakaoGlobal.maps.load(() => {
        if (w.kakao?.maps) {
          debugKakao("info", "maps.load 콜백 완료 (이후에도 타일이 안 보이면 Console에 남는 카카오 메시지·Network의 타일 요청을 확인)");
          resolve(w.kakao);
        } else {
          debugKakao("error", "maps.load 콜백 후 window.kakao.maps 없음");
          reject(new Error("kakao maps.load failed"));
        }
      });
    };
    script.onerror = (ev) => {
      debugKakao(
        "error",
        "sdk.js 네트워크 로드 실패 — 카카오 앱키/도메인 문제가 아니라, 요청 자체가 막히거나 끊긴 단계입니다. Network 탭에서 dapi.kakao.com 요청 상태를 확인하세요.",
        ev
      );
      script.remove();
      reject(new Error("kakao script error"));
    };
    document.head.appendChild(script);
  });
}

function makeDot(color: string, selected: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.borderRadius = "9999px";
  el.style.backgroundColor = selected ? "#0f172a" : color;
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
  el.style.border = "2px solid #fff";
  el.style.cursor = "pointer";
  if (selected) el.style.outline = `3px solid ${color}`;
  return el;
}

function readMapBounds(map: KakaoMapInstance): ViewBounds | null {
  const m = map as unknown as {
    getBounds?: () => {
      getSouthWest: () => { getLat: () => number; getLng: () => number };
      getNorthEast: () => { getLat: () => number; getLng: () => number };
    };
  };
  const box = m.getBounds?.();
  if (!box) return null;
  const sw = box.getSouthWest();
  const ne = box.getNorthEast();
  return {
    minLat: sw.getLat(),
    maxLat: ne.getLat(),
    minLng: sw.getLng(),
    maxLng: ne.getLng(),
  };
}

type Props = {
  appKey: string;
  /** 첫 지도 중심(위치 권한 또는 서울 기본값). 카카오 콘솔에 이 페이지 도메인(예: http://localhost:3002)이 등록되어 있어야 타일이 보입니다. */
  initialCenter: { lat: number; lng: number };
  /** GPS 허용 시 내 좌표 — 파란 점 마커·「내 위치」 시 카메라 이동 */
  userAnchor: { lat: number; lng: number } | null;
  /** 「내 위치」 클릭 시 증가 — 카메라를 userAnchor·기본 줌으로 맞춤 */
  mapFitNonce: number;
  stores: StoreRow[];
  reportsByStoreId: Record<string, StatusReport[]>;
  selectedId: string | null;
  onSelectStore: (store: StoreRow) => void;
  onViewportBoundsChange?: (b: ViewBounds) => void;
};

export function KakaoMap({
  appKey,
  initialCenter,
  userAnchor,
  mapFitNonce,
  stores,
  reportsByStoreId,
  selectedId,
  onSelectStore,
  onViewportBoundsChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const kakaoRef = useRef<KakaoMapsNS | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  /** 확대·축소 버튼 비활성 및 휠/제스처 후 동기화 */
  const [mapLevel, setMapLevel] = useState(KAKAO_MAP_DEFAULT_LEVEL);
  const viewportCbRef = useRef(onViewportBoundsChange);
  viewportCbRef.current = onViewportBoundsChange;

  const overlaysRef = useRef<
    { overlay: { setMap: (m: KakaoMapInstance | null) => void }; onClick: (e: MouseEvent) => void; el: HTMLElement }[]
  >([]);

  const userPinRef = useRef<{ setMap: (m: KakaoMapInstance | null) => void } | null>(null);
  const lastMapFitNonceRef = useRef(0);

  useEffect(() => {
    if (!appKey || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;
    setMapError(null);

    loadKakaoScript(appKey)
      .then((kakao) => {
        if (cancelled || !container) return;
        kakaoRef.current = kakao;
        const center = new kakao.maps.LatLng(initialCenter.lat, initialCenter.lng);
        try {
          const map = new kakao.maps.Map(container, { center, level: KAKAO_MAP_DEFAULT_LEVEL });
          mapRef.current = map;
          setMapReady(true);
          debugKakao("info", "new kakao.maps.Map 성공 — 카카오 SDK가 추가로 찍는 warn/error는 아래 그대로 두었습니다. 필터 없음.");
        } catch (mapErr) {
          debugKakao("error", "new kakao.maps.Map 실행 중 예외", mapErr);
          throw mapErr;
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setMapReady(false);
        debugKakao("error", "로드 파이프라인 실패(원본)", e);
        const isScriptBlocked = e instanceof Error && e.message === "kakao script error";
        if (isScriptBlocked) {
          setMapError(
            "카카오 sdk.js 파일을 브라우저가 받지 못했습니다. JavaScript 키/도메인 설정 이전 단계에서 막힌 것입니다. 개발자 도구 → Network에서 dapi.kakao.com 또는 sdk.js 요청이 failed·blocked·(canceled)인지 확인하세요. uBlock·AdGuard·Brave 차단·회사 VPN/방화벽을 끄거나 예외로 두고, 시크릿 창에서도 재시도해 보세요."
          );
          return;
        }
        const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
        setMapError(
          `카카오 지도를 불러오지 못했습니다.${detail} Console에서 「봉투어디 KakaoMap」으로 검색해 로그를 확인하세요.`
        );
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      kakaoRef.current = null;
      lastMapFitNonceRef.current = 0;
      setMapReady(false);
      setMapError(null);
    };
  }, [appKey, initialCenter.lat, initialCenter.lng]);

  /** 「내 위치」 — mapFitNonce가 바뀔 때만 카메라 이동(스토어 갱신 리렌더로는 재실행 안 함). */
  useEffect(() => {
    if (!mapReady || mapFitNonce === 0 || !userAnchor) return;
    if (lastMapFitNonceRef.current === mapFitNonce) return;
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;
    map.setCenter(new kakao.maps.LatLng(userAnchor.lat, userAnchor.lng));
    map.setLevel(KAKAO_MAP_DEFAULT_LEVEL);
    try {
      setMapLevel(map.getLevel());
    } catch {
      setMapLevel(KAKAO_MAP_DEFAULT_LEVEL);
    }
    lastMapFitNonceRef.current = mapFitNonce;
    if (!onViewportBoundsChange) return;
    const t = window.setTimeout(() => {
      const b = readMapBounds(map);
      if (b) viewportCbRef.current?.(b);
    }, 150);
    return () => window.clearTimeout(t);
  }, [mapReady, mapFitNonce, userAnchor, onViewportBoundsChange]);

  useEffect(() => {
    if (!mapReady || !userAnchor) {
      userPinRef.current?.setMap(null);
      userPinRef.current = null;
      return;
    }
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;

    userPinRef.current?.setMap(null);
    const el = document.createElement("div");
    el.setAttribute("aria-label", "내 위치");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "9999px";
    el.style.backgroundColor = "#2563eb";
    el.style.border = "3px solid #fff";
    el.style.boxShadow = "0 1px 5px rgba(0,0,0,0.35)";
    const overlay = new kakao.maps.CustomOverlay({
      map,
      position: new kakao.maps.LatLng(userAnchor.lat, userAnchor.lng),
      content: el,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });
    userPinRef.current = overlay;

    return () => {
      overlay.setMap(null);
      userPinRef.current = null;
    };
  }, [mapReady, userAnchor]);

  useEffect(() => {
    if (!mapReady || !onViewportBoundsChange) return;
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;

    const emit = () => {
      const b = readMapBounds(map);
      if (b) viewportCbRef.current?.(b);
    };

    const idle = () => emit();
    kakao.maps.event.addListener(map, "idle", idle);
    const t = window.setTimeout(emit, 120);

    return () => {
      window.clearTimeout(t);
      kakao.maps.event.removeListener(map, "idle", idle);
    };
  }, [mapReady, onViewportBoundsChange]);

  /** 휠·제스처·프로그램 이동 후 줌 단계 UI 동기화 */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;

    const syncLevel = () => {
      try {
        setMapLevel(map.getLevel());
      } catch {
        /* noop */
      }
    };

    kakao.maps.event.addListener(map, "idle", syncLevel);
    syncLevel();

    return () => {
      kakao.maps.event.removeListener(map, "idle", syncLevel);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;

    for (const o of overlaysRef.current) {
      o.el.removeEventListener("click", o.onClick);
      o.overlay.setMap(null);
    }
    overlaysRef.current = [];

    for (const store of stores) {
      const reports = reportsByStoreId[store.id] ?? [];
      const status = computeMarkerStatus(reports);
      const color = MARKER_COLORS[status];
      const selected = selectedId === store.id;
      const content = makeDot(color, selected);
      const position = new kakao.maps.LatLng(store.lat, store.lng);
      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content,
        yAnchor: 0.5,
        xAnchor: 0.5,
        clickable: true,
      });

      const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        onSelectStore(store);
      };
      content.addEventListener("click", onClick);
      overlaysRef.current.push({ overlay, onClick, el: content });
    }

    return () => {
      for (const o of overlaysRef.current) {
        o.el.removeEventListener("click", o.onClick);
        o.overlay.setMap(null);
      }
      overlaysRef.current = [];
    };
  }, [mapReady, stores, reportsByStoreId, selectedId, onSelectStore]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = window.setTimeout(() => map.relayout(), 200);
    return () => window.clearTimeout(t);
  }, [selectedId]);

  const zoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const cur = map.getLevel();
    const next = Math.max(KAKAO_MAP_MIN_LEVEL, cur - 1);
    map.setLevel(next);
    setMapLevel(next);
  }, []);

  const zoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const cur = map.getLevel();
    const next = Math.min(KAKAO_MAP_MAX_LEVEL, cur + 1);
    map.setLevel(next);
    setMapLevel(next);
  }, []);

  const canZoomIn = mapLevel > KAKAO_MAP_MIN_LEVEL;
  const canZoomOut = mapLevel < KAKAO_MAP_MAX_LEVEL;

  return (
    <div className="relative flex h-full min-h-[240px] w-full flex-col bg-slate-200">
      {mapError ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-slate-800">
          {mapError}
        </div>
      ) : (
        <>
          <div ref={containerRef} className="h-full min-h-[240px] w-full flex-1" />
          {mapReady ? (
            <div
              className="pointer-events-none absolute bottom-24 right-3 z-20 flex flex-col overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-slate-200"
              role="group"
              aria-label="지도 확대·축소"
            >
              <button
                type="button"
                onClick={zoomIn}
                disabled={!canZoomIn}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center text-lg font-medium leading-none text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="지도 확대"
              >
                +
              </button>
              <span className="pointer-events-none block h-px bg-slate-200" aria-hidden />
              <button
                type="button"
                onClick={zoomOut}
                disabled={!canZoomOut}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center text-lg font-medium leading-none text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="지도 축소"
              >
                −
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
