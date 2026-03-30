"use client";

import type { StoreRow } from "@/lib/types";
import {
  STATUS_GUIDE,
  computeMarkerStatus,
  formatRelativeTime,
  type ReportRow as StatusReport,
} from "@/lib/marker-status";

type Props = {
  store: StoreRow;
  reports: StatusReport[];
  submitting: boolean;
  onClose: () => void;
  onReport: (isAvailable: boolean) => void;
};

export function BottomSheet({ store, reports, submitting, onClose, onReport }: Props) {
  const status = computeMarkerStatus(reports);
  const lastAt =
    reports.length > 0
      ? [...reports].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at
      : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col justify-end pb-[var(--safe-bottom)]">
      <button
        type="button"
        aria-label="닫기"
        className="min-h-12 flex-1 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="rounded-t-2xl bg-white px-4 pb-6 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <h2 className="text-lg font-semibold text-slate-900">{store.name}</h2>
        {store.address ? <p className="mt-1 text-sm text-slate-500">{store.address}</p> : null}
        <p className="mt-3 text-sm text-slate-700">{STATUS_GUIDE[status]}</p>
        <p className="mt-1 text-xs text-slate-400">마지막 제보: {formatRelativeTime(lastAt)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => onReport(true)}
            className="rounded-xl bg-marker-green py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            재고 있음
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onReport(false)}
            className="rounded-xl bg-marker-red py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            품절
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">제보는 익명으로 저장됩니다.</p>
      </div>
    </div>
  );
}
