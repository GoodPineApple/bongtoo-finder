import { NextResponse } from "next/server";
import { ReportsStorageNotConfiguredError, addReport, listReports } from "@/lib/server/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("store_ids");
  const storeIds =
    raw && raw.length > 0
      ? new Set(
          raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      : undefined;

  const reports = await listReports(storeIds && storeIds.size > 0 ? { storeIds } : undefined);
  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const store_id = (body as { store_id?: unknown }).store_id;
  const is_available = (body as { is_available?: unknown }).is_available;
  if (typeof store_id !== "string" || !store_id.trim()) {
    return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  }
  if (typeof is_available !== "boolean") {
    return NextResponse.json({ error: "is_available must be boolean" }, { status: 400 });
  }

  try {
    const report = await addReport({ store_id: store_id.trim(), is_available });
    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof ReportsStorageNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const message = e instanceof Error ? e.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
