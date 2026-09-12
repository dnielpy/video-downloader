"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";

type DownloadFormProps = {
  isSubmitting: boolean;
  onSubmit: (url: string) => Promise<boolean>;
};

export function DownloadForm({ isSubmitting, onSubmit }: DownloadFormProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (await onSubmit(url)) {
      setUrl("");
    }
  };

  return (
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleSubmit(event)}>
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
    </form>
  );
}
