import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pruneReports, type StoredReport } from "@/lib/server/reports-shared";

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "reports.json");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}

async function ensureDirAndFile(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(filePath);
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

async function loadPrunePersist(): Promise<StoredReport[]> {
  await ensureDirAndFile();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return [];
  }
  let list: StoredReport[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) list = parsed as StoredReport[];
  } catch {
    list = [];
  }
  const pruned = pruneReports(list);
  if (pruned.length !== list.length) {
    await writeFile(filePath, JSON.stringify(pruned), "utf8");
  }
  return pruned;
}

export async function listReportsLocal(filter?: { storeIds?: Set<string> }): Promise<StoredReport[]> {
  return withLock(async () => {
    const all = await loadPrunePersist();
    if (filter?.storeIds && filter.storeIds.size > 0) {
      return all.filter((r) => filter.storeIds!.has(r.store_id));
    }
    return all;
  });
}

export async function addReportLocal(input: {
  store_id: string;
  is_available: boolean;
}): Promise<StoredReport> {
  return withLock(async () => {
    const list = await loadPrunePersist();
    const row: StoredReport = {
      id: crypto.randomUUID(),
      store_id: input.store_id,
      is_available: input.is_available,
      created_at: new Date().toISOString(),
    };
    list.push(row);
    await writeFile(filePath, JSON.stringify(list), "utf8");
    return row;
  });
}
