import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Loader2 } from "lucide-react";

type RecordingShape = {
  transcript?: string | null;
  durationSec?: number | null;
};

/**
 * Lazy-load + collapsible transcript shown under CF Stream embeds.
 *
 * Hits GET /api/recordings/<streamUid> ONLY when the user expands the panel,
 * then caches in component state. Returns null silently if the recording is
 * not found or the transcript is empty (don't pollute the feed with empty
 * panels for sine-wave test clips, etc.).
 */
export function TranscriptPanel({ streamUid }: { streamUid: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecordingShape | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/recordings/${streamUid}`, {
          credentials: "include",
        });
        if (!r.ok) throw new Error(`Could not load transcript (${r.status})`);
        const row = (await r.json()) as RecordingShape;
        setData(row);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load transcript");
      } finally {
        setLoading(false);
      }
    }
  }

  // We always show the header so members KNOW the video has a searchable
  // transcript — the auto-Whisper pipeline is a Baingers differentiator.
  return (
    <div className="mt-2 rounded-lg border border-border bg-card/50">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 rounded-lg"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          {open ? "Hide transcript" : "Show transcript"}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed border-t border-border pt-2">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading transcript…
            </div>
          )}
          {!loading && err && (
            <div className="text-xs text-red-500">{err}</div>
          )}
          {!loading && !err && data && (
            <>
              {data.transcript ? (
                <p>{data.transcript}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Transcript still encoding or this clip has no detectable speech.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
