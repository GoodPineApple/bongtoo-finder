import { MapPageClient } from "@/components/MapPageClient";

export default function HomePage() {
  const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "";

  return <MapPageClient kakaoAppKey={kakaoAppKey} />;
}
