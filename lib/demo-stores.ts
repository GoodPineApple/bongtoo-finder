import type { StoreRow } from "./types";

/** Supabase 미연결 시 지도·UI 확인용 샘플 (서울 시청 인근) */
export const DEMO_STORES: StoreRow[] = [
  {
    id: "demo-1",
    name: "데모 편의점 A",
    address: "서울특별시 중구 세종대로 110",
    lat: 37.5665,
    lng: 126.978,
  },
  {
    id: "demo-2",
    name: "데모 마트 B",
    address: "서울특별시 중구 을지로",
    lat: 37.5651,
    lng: 126.989,
  },
];
