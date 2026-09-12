"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiErrorResponse,
  Download,
  DownloadAction,
  DownloadsResponse,
} from "@/src/modules/downloads/types";

const EMPTY_DASHBOARD: DownloadsResponse = {
  downloads: [],
  stats: {
    downloadSpeedBytesPerSecond: 0,
    active: 0,
    waiting: 0,
    stopped: 0,
  },
};

async function getResponseError(response: Response) {
  try {
    const payload = (await response.json()) as Partial<ApiErrorResponse>;
    return payload.error?.message || `Request failed with HTTP ${response.status}.`;
  } catch {
    return `Request failed with HTTP ${response.status}.`;
  }
}

export function useDownloads(initialData: DownloadsResponse | null, initialError?: string) {
  const [data, setData] = useState(initialData ?? EMPTY_DASHBOARD);
  const [connectionError, setConnectionError] = useState<string | null>(initialError ?? null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingActions, setPendingActions] = useState<Record<string, DownloadAction>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(false);
  const pollRef = useRef<() => Promise<void>>(async () => undefined);

  const replaceDownload = useCallback((download: Download) => {
    setData((current) => ({
      ...current,
      downloads: current.downloads.some((candidate) => candidate.id === download.id)
        ? current.downloads.map((candidate) => candidate.id === download.id ? download : candidate)
        : [download, ...current.downloads],
    }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const poll = async () => {
      clearTimer();

      if (!mountedRef.current || document.visibilityState === "hidden") {
        return;
      }

      const generation = ++generationRef.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const response = await fetch("/api/downloads", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const nextData = (await response.json()) as DownloadsResponse;

        if (mountedRef.current && generation === generationRef.current) {
          setData(nextData);
          setConnectionError(null);
        }
      } catch (error) {
        if (
          mountedRef.current &&
          generation === generationRef.current &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setConnectionError(error instanceof Error ? error.message : "Unable to refresh downloads.");
        }
      } finally {
        if (
          mountedRef.current &&
          generation === generationRef.current
        ) {
          timerRef.current = setTimeout(() => void pollRef.current(), 1_000);
        }
      }
    };

    pollRef.current = poll;

    const handleVisibilityChange = () => {
      clearTimer();
      controllerRef.current?.abort();
      generationRef.current += 1;

      if (document.visibilityState !== "hidden") {
        void pollRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void poll();

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearTimer();
      controllerRef.current?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const refreshNow = useCallback(() => {
    void pollRef.current();
  }, []);

  const add = useCallback(async (url: string) => {
    setIsCreating(true);
    setOperationError(null);

    try {
      const response = await fetch("/api/downloads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const payload = (await response.json()) as { download: Download };
      replaceDownload(payload.download);
      refreshNow();
      return true;
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to add the download.");
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [refreshNow, replaceDownload]);

  const runAction = useCallback(async (download: Download, action: DownloadAction) => {
    setPendingActions((current) => ({ ...current, [download.id]: action }));
    setOperationError(null);

    const endpoint = action === "cancel"
      ? `/api/downloads/${download.id}`
      : `/api/downloads/${download.id}/${action}`;

    try {
      const response = await fetch(endpoint, { method: action === "cancel" ? "DELETE" : "POST" });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const payload = (await response.json()) as { download: Download };
      replaceDownload(payload.download);
      refreshNow();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : `Unable to ${action} the download.`);
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[download.id];
        return next;
      });
    }
  }, [refreshNow, replaceDownload]);

  return {
    data,
    connectionError,
    operationError,
    isCreating,
    pendingActions,
    add,
    runAction,
    dismissOperationError: () => setOperationError(null),
  };
}
