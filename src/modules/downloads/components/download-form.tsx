"use client";

import { Download, Images, LoaderCircle, Video, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";
import type { DownloadDestination } from "@/src/modules/downloads/types";

type DownloadFormProps = {
  isSubmitting: boolean;
  onSubmit: (url: string, destination: DownloadDestination) => Promise<boolean>;
};

export function DownloadForm({ isSubmitting, onSubmit }: DownloadFormProps) {
  const [url, setUrl] = useState("");
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setPendingUrl(url.trim());
  };

  const extension = pendingUrl ? new URL(pendingUrl).pathname.split(".").pop()?.toLowerCase() : "";
  async function choose(destination: DownloadDestination) { if (!pendingUrl) return; if (await onSubmit(pendingUrl, destination)) { setUrl(""); setPendingUrl(null); } }

  return (
    <><form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleSubmit(event)}>
      <label className="sr-only" htmlFor="download-url">Download URL</label>
      <input
        autoComplete="off"
        autoFocus
        className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background/70 px-4 text-[15px] shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/15"
        disabled={isSubmitting}
        id="download-url"
        onChange={(event) => setUrl(event.currentTarget.value)}
        placeholder="Paste download URL…"
        required
        type="url"
        value={url}
      />
      <Button className="h-12 shrink-0 px-5" disabled={isSubmitting || !url.trim()} type="submit">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        {isSubmitting ? "Adding…" : "Download"}
      </Button>
    </form>{pendingUrl && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"><section role="dialog" aria-modal="true" aria-labelledby="destination-title" className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Download destination</p><h2 id="destination-title" className="mt-1 text-2xl font-semibold">Where should this file go?</h2></div><Button size="icon" variant="ghost" onClick={() => setPendingUrl(null)}><X /></Button></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="rounded-2xl border border-border p-5 text-left transition hover:border-primary hover:bg-primary/5" onClick={() => void choose("streamlt")} disabled={isSubmitting}><Video className="mb-4 size-7 text-primary"/><strong>Streamlt</strong><p className="mt-1 text-sm text-muted-foreground">Save to your video library.</p></button><button className="rounded-2xl border border-border p-5 text-left transition hover:border-primary hover:bg-primary/5" onClick={() => void choose("lgallery")} disabled={isSubmitting}><Images className="mb-4 size-7 text-primary"/><strong>LGallery</strong><p className="mt-1 text-sm text-muted-foreground">Save to your photo and video gallery.</p></button></div>{extension && !["mp4","webm","jpg","jpeg","png","webp","gif"].includes(extension) && <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">This file extension may not be displayed by the selected app. You can still download it.</p>}</section></div>}</>
  );
}
