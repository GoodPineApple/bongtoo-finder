import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { clampBounds } from "@/lib/store-bounds";

export const runtime = "nodejs";

type StoreJsonRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  business_reg_no?: string | null;
};

let cache: { mtimeMs: number; rows: StoreJsonRow[] } | null = null;

async function loadRows(): Promise<StoreJsonRow[]> {
  const filePath = path.join(process.cwd(), "public", "data", "stores.json");
  const st = await stat(filePath);
  if (cache && cache.mtimeMs === st.mtimeMs) return cache.rows;

  const raw = await readFile(filePath, "utf8");
  const rows = JSON.parse(raw) as StoreJsonRow[];
  cache = { mtimeMs: st.mtimeMs, rows };
  return rows;
}

function parseNum(v: string | null, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minLat = parseNum(searchParams.get("minLat"), 33);
  const maxLat = parseNum(searchParams.get("maxLat"), 39);
  const minLng = parseNum(searchParams.get("minLng"), 124);
  const maxLng = parseNum(searchParams.get("maxLng"), 132);
  const limit = Math.min(2500, Math.max(1, parseInt(searchParams.get("limit") ?? "1500", 10) || 1500));

  const b = clampBounds({ minLat, maxLat, minLng, maxLng });

  try {
    const all = await loadRows();
    const stores: Omit<StoreJsonRow, "business_reg_no">[] = [];
    for (const r of all) {
      if (r.lat < b.minLat || r.lat > b.maxLat || r.lng < b.minLng || r.lng > b.maxLng) continue;
      stores.push({
        id: r.id,
        name: r.name,
        address: r.address ?? null,
        lat: r.lat,
        lng: r.lng,
      });
      if (stores.length >= limit) break;
    }
    return NextResponse.json({ stores, count: stores.length });
  } catch {
    return NextResponse.json(
      { error: "stores.json 없음. `npm run build:stores` 실행 후 다시 시도하세요.", stores: [] },
      { status: 404 }
    );
  }
}
