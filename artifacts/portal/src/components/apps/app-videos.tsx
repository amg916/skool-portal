import { useState } from "react";
import { ChevronDown, PlayCircle, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDetachAppVideo, type AppVideo } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function duration(sec: number | null | undefined) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Per-app video. Plays the recording straight from Cloudflare Stream via its
 * existing embed URL — the record → Stream → Whisper pipeline already produced
 * everything here, including the transcript.
 */
export function AppVideos({
  appId,
  videos,
  isAdmin,
}: {
  appId: number;
  videos: AppVideo[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const detach = useDetachAppVideo({ mutation: { onSuccess: () => qc.invalidateQueries() } });
  const [openTranscript, setOpenTranscript] = useState<number | null>(null);

  if (!videos.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <PlayCircle className="h-4 w-4" />
        Watch
      </h2>
      <div className="space-y-4">
        {videos.map((v) => (
          <div key={v.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{v.title || "Walkthrough"}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {v.role}
              </Badge>
              {duration(v.durationSec) && (
                <span className="text-xs text-muted-foreground">{duration(v.durationSec)}</span>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto gap-1 text-muted-foreground"
                  disabled={detach.isPending}
                  onClick={() => detach.mutate({ id: appId, videoId: v.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>

            {v.embedUrl ? (
              <div className="aspect-video overflow-hidden rounded-md border bg-black">
                <iframe
                  src={v.embedUrl}
                  title={v.title || "App walkthrough"}
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Still encoding — check back shortly.</p>
            )}

            {v.transcript && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 px-0 text-muted-foreground"
                  onClick={() => setOpenTranscript(openTranscript === v.id ? null : v.id)}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openTranscript === v.id ? "rotate-180" : ""}`}
                  />
                  Transcript
                </Button>
                {openTranscript === v.id && (
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    {v.transcript}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
