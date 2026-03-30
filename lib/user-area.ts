import type { ViewBounds } from "@/lib/store-bounds";

/**
 * 위치 권한이 없을 때 지도·매장 검색 기준
 * 서울특별시 종로구 종로 1 (종로1가 일대, 대략 좌표)
 */
export const FALLBACK_CENTER_JONGNO = {
  lat: 37.56991,
  lng: 126.98276,
} as const;

/** 대략 ±pad 도 (~수 km) 박스 */
export function boundsAroundPoint(lat: number, lng: number, pad = 0.07): ViewBounds {
  return {
    minLat: lat - pad,
    maxLat: lat + pad,
    minLng: lng - pad,
    maxLng: lng + pad,
  };
}

function fallbackArea(): { center: { lat: number; lng: number }; bounds: ViewBounds } {
  const { lat, lng } = FALLBACK_CENTER_JONGNO;
  return {
    center: { lat, lng },
    bounds: boundsAroundPoint(lat, lng, 0.07),
  };
}

/**
 * 가능하면 브라우저 위치 주변 bbox, 아니면 종로 1 기준.
 * 권한 거부·타임아웃 시에도 항상 resolve.
 */
export function resolveInitialMapArea(timeoutMs = 10000): Promise<{
  center: { lat: number; lng: number };
  bounds: ViewBounds;
  usedGeolocation: boolean;
}> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    const fb = fallbackArea();
    return Promise.resolve({
      ...fb,
      usedGeolocation: false,
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          resolve({
            ...fallbackArea(),
            usedGeolocation: false,
          });
          return;
        }
        resolve({
          center: { lat, lng },
          bounds: boundsAroundPoint(lat, lng, 0.07),
          usedGeolocation: true,
        });
      },
      () =>
        resolve({
          ...fallbackArea(),
          usedGeolocation: false,
        }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );
  });
}

/** 「내 위치」 버튼 등 — 성공 시 좌표, 실패 시 null */
export function getCurrentUserPosition(timeoutMs = 12000): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          resolve(null);
          return;
        }
        resolve({ lat, lng });
      },
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );
  });
}
