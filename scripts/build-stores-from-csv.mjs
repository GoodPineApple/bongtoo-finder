/**
 * 공공데이터 `assets/stores.csv` (CP949) → UTF-8 `public/data/stores.json`
 * - 영업상태명이 "영업"인 행만 포함
 * - id: 사업자등록번호 기반 UUID v5 (Supabase 적재 시 동일 id 사용)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
import { v5 as uuidv5 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CSV_PATH = path.join(root, "assets", "stores.csv");
const OUT_PATH = path.join(root, "public", "data", "stores.json");
const STORE_NAMESPACE = "e621e1f8-c36c-495a-93fc-0c247a3e6e5f";

function stableKey(record) {
  const reg = (record["사업자등록번호"] ?? "").trim();
  if (reg) return `reg:${reg}`;
  const name = (record["판매소명"] ?? "").trim();
  const lat = (record["위도"] ?? "").trim();
  const lng = (record["경도"] ?? "").trim();
  return `geo:${name}|${lat}|${lng}`;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error("Missing:", CSV_PATH);
    process.exit(1);
  }
  const buf = fs.readFileSync(CSV_PATH);
  const text = iconv.decode(buf, "cp949");
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const seen = new Set();
  const out = [];

  for (const r of records) {
    if ((r["영업상태명"] ?? "").trim() !== "영업") continue;

    const name = (r["판매소명"] ?? "").trim();
    if (!name) continue;

    const lat = parseFloat(r["위도"]);
    const lng = parseFloat(r["경도"]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) continue;

    const key = stableKey(r);
    if (seen.has(key)) continue;
    seen.add(key);

    const id = uuidv5(key, STORE_NAMESPACE);
    const road = (r["소재지도로명주소"] ?? "").trim();
    const jibun = (r["소재지지번주소"] ?? "").trim();
    const address = road || jibun || null;
    const businessRegNo = (r["사업자등록번호"] ?? "").trim() || null;

    out.push({
      id,
      name,
      address,
      lat,
      lng,
      business_reg_no: businessRegNo,
    });
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out), "utf8");
  console.log("Wrote", out.length, "stores →", path.relative(root, OUT_PATH));
}

main();
