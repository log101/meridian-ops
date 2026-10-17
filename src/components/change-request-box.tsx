"use client";

import { ArrowUpRightIcon, CheckCircle2Icon, SparklesIcon } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { loadChangeRequests, submitChangeRequest, type ChangeRequest } from "@/lib/actions/theseus";
import type { StageTone } from "@/lib/theseus/client";
import { relativeTime } from "@/lib/format";

const MAX = 8000;

const toneClass: Record<StageTone, string> = {
  progress: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  attention: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  muted: "bg-muted text-muted-foreground",
};

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

/**
 * "Request a change" in the header: a small box with the requests already
 * filed and a field to file a new one. Each request links to its page in
 * Theseus, where it is planned, previewed and accepted.
 */
export function ChangeRequestBox() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState<ChangeRequest | null>(null);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();
  // One id per draft: a double submit or a retry after a lost response files
  // the request once.
  const requestId = useRef(newRequestId());

  const refresh = useCallback(() => {
    startLoading(async () => {
      const res = await loadChangeRequests();
      if (res.error) setListError(res.error);
      else {
        setListError(null);
        setRequests(res.requests ?? []);
      }
    });
  }, []);

  const canSend = prompt.trim().length > 0 && prompt.length <= MAX && !sending;

  const submit = () => {
    if (!canSend) return;
    setSubmitError(null);
    startSending(async () => {
      const res = await submitChangeRequest(prompt, requestId.current);
      if (res.error || !res.request) {
        setSubmitError(res.error ?? "Something went wrong");
        return;
      }
      const filed = res.request;
      requestId.current = newRequestId();
      setPrompt("");
      setSent(filed);
      setRequests((prev) => [filed, ...(prev ?? []).filter((r) => r.id !== filed.id)]);
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) refresh();
        else setSent(null);
      }}
    >
      <PopoverTrigger render={<Button size="sm" variant="outline" />}>
        <SparklesIcon className="size-4" />
        <span className="hidden sm:inline">Request a change</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>Request a change</PopoverTitle>
          <PopoverDescription>
            Describe what Meridian Ops should do differently. Theseus plans it, builds a preview and nothing ships until it is
            accepted.
          </PopoverDescription>
        </PopoverHeader>

        {sent ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3" role="status">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              Request sent
            </div>
            <p className="line-clamp-2 text-muted-foreground">{sent.summary}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" render={<a href={sent.url} target="_blank" rel="noreferrer" />}>
                Follow it in Theseus
                <ArrowUpRightIcon className="size-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSent(null)}>
                Request another
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={3}
              maxLength={MAX}
              autoFocus
              aria-label="Describe the change"
              placeholder="Show the total of the selected expenses at the bottom of the list."
              className="min-h-20 resize-none"
            />
            {submitError ? (
              <p role="alert" className="text-xs text-destructive">
                {submitError}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Ctrl + Enter to send</span>
              <Button type="submit" size="sm" disabled={!canSend}>
                {sending ? "Sending…" : "Send request"}
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-1.5 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">Previous requests</div>
          {listError ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-destructive">{listError}</span>
              <Button size="xs" variant="ghost" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : requests === null ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-xs text-muted-foreground">No requests yet. The first one starts here.</p>
          ) : (
            <ul className={cn("-mx-1 flex max-h-64 flex-col overflow-y-auto", loading && "opacity-70")}>
              {requests.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.summary}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("rounded px-1.5 py-px font-medium", toneClass[r.tone])}>{r.stage}</span>
                        <span>{relativeTime(r.createdAt)}</span>
                      </div>
                    </div>
                    <ArrowUpRightIcon className="mt-0.5 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
