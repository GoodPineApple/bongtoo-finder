/** 지도 최초 로드 시 사용하는 대략적인 뷰(서울·수도권 중심) */
export const DEFAULT_VIEW_BOUNDS = {
  minLat: 37.42,
  maxLat: 37.72,
  minLng: 126.72,
  maxLng: 127.28,
} as const;

export type ViewBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function clampBounds(b: ViewBounds): ViewBounds {
  return {
    minLat: Math.min(b.minLat, b.maxLat),
    maxLat: Math.max(b.minLat, b.maxLat),
    minLng: Math.min(b.minLng, b.maxLng),
    maxLng: Math.max(b.minLng, b.maxLng),
  };
}
