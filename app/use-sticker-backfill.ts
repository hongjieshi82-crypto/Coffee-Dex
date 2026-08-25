"use client";

import { useEffect, useRef } from "react";
import {
  CoffeeRecord,
  CURRENT_STICKER_VERSION,
  hasUsableCurrentSticker,
} from "@/coffee-data";
import {
  createSticker,
  isStickerQueueIdle,
  resetStickerEngine,
} from "@/app/mobile/sticker";

const IDLE_RECHECK_MS = 3_000;
const EMPTY_RECHECK_MS = 10_000;
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

interface StickerBackfillOptions {
  records: CoffeeRecord[];
  activeOwner: string | null;
  recordsReady: boolean;
  enabled: boolean;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onUnauthorized: () => void;
  onRecordUpdated: (record: CoffeeRecord) => void;
}

type RetryState = {
  attempts: number;
  retryAt: number;
};

export function useStickerBackfill({
  records,
  activeOwner,
  recordsReady,
  enabled,
  getAuthHeaders,
  onUnauthorized,
  onRecordUpdated,
}: StickerBackfillOptions) {
  const recordsRef = useRef(records);
  const activeOwnerRef = useRef(activeOwner);
  const getAuthHeadersRef = useRef(getAuthHeaders);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const onRecordUpdatedRef = useRef(onRecordUpdated);
  const retryStateRef = useRef<Map<string, RetryState>>(new Map());
  const inFlightRef = useRef(false);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    activeOwnerRef.current = activeOwner;
  }, [activeOwner]);

  useEffect(() => {
    getAuthHeadersRef.current = getAuthHeaders;
    onUnauthorizedRef.current = onUnauthorized;
    onRecordUpdatedRef.current = onRecordUpdated;
  }, [getAuthHeaders, onRecordUpdated, onUnauthorized]);

  useEffect(() => {
    retryStateRef.current.clear();
    resetStickerEngine();
  }, [activeOwner]);

  useEffect(() => {
    if (!enabled || !activeOwner || !recordsReady) return;

    let disposed = false;
    let timer: number | null = null;

    const schedule = (delayMs: number) => {
      if (disposed) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), delayMs);
    };

    const run = async () => {
      timer = null;
      if (disposed || activeOwnerRef.current !== activeOwner) return;

      if (inFlightRef.current || !isStickerQueueIdle()) {
        schedule(IDLE_RECHECK_MS);
        return;
      }

      const candidate = findLatestStickerCandidate(
        recordsRef.current,
        retryStateRef.current,
        Date.now()
      );

      if (!candidate?.imageData) {
        schedule(EMPTY_RECHECK_MS);
        return;
      }

      inFlightRef.current = true;

      try {
        const generation = await createSticker(candidate.imageData, "background");
        if (activeOwnerRef.current !== activeOwner) return;

        if (!generation.sticker) {
          if (generation.retryable) {
            markFailure(retryStateRef.current, candidate.id);
          } else {
            suppressForSession(retryStateRef.current, candidate.id);
          }
          return;
        }

        const headers = await getAuthHeadersRef.current();
        if (activeOwnerRef.current !== activeOwner) return;

        const response = await fetch("/api/records", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            id: candidate.id,
            stickerData: generation.sticker,
            stickerVersion: CURRENT_STICKER_VERSION,
          }),
        });

        if (activeOwnerRef.current !== activeOwner) return;

        if (response.status === 401) {
          onUnauthorizedRef.current();
          return;
        }

        if (!response.ok) {
          markFailure(retryStateRef.current, candidate.id);
          return;
        }

        const data = (await response.json()) as { record: CoffeeRecord };
        retryStateRef.current.delete(candidate.id);
        onRecordUpdatedRef.current(data.record);
      } catch (error) {
        if (activeOwnerRef.current === activeOwner) {
          markFailure(retryStateRef.current, candidate.id);
          console.warn("[Coffee-Dex] Sticker backfill failed:", error);
        }
      } finally {
        inFlightRef.current = false;
        schedule(IDLE_RECHECK_MS);
      }
    };

    schedule(IDLE_RECHECK_MS);

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeOwner, enabled, recordsReady]);
}

function findLatestStickerCandidate(
  records: CoffeeRecord[],
  retryStates: Map<string, RetryState>,
  now: number
) {
  return records
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .find((record) => {
      const retryState = retryStates.get(record.id);

      return Boolean(
        record.imageData &&
        (
          (record.stickerVersion ?? 0) < CURRENT_STICKER_VERSION ||
          !hasUsableCurrentSticker(record)
        ) &&
        (!retryState || retryState.retryAt <= now)
      );
    });
}

function markFailure(retryStates: Map<string, RetryState>, recordId: string) {
  const attempts = (retryStates.get(recordId)?.attempts ?? 0) + 1;
  const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
  retryStates.set(recordId, { attempts, retryAt: Date.now() + delay });
}

function suppressForSession(retryStates: Map<string, RetryState>, recordId: string) {
  retryStates.set(recordId, { attempts: 1, retryAt: Number.POSITIVE_INFINITY });
}
