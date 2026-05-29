import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Mic,
  Monitor,
  Video,
  Square,
  Pause,
  Play,
  Loader2,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SourceMode = "screen" | "cam" | "screen+cam";

type Phase =
  | "idle"
  | "permission"
  | "recording"
  | "paused"
  | "stopping"
  | "uploading"
  | "encoding"
  | "ready"
  | "error";

const MAX_DURATION_SECONDS = 600; // 10 min brand cap

export type RecordedBanger = {
  recordingId: number;
  streamUid: string;
  embedUrl: string;
  durationSec: number;
};

export function RecordButton({
  trigger,
  onComplete,
}: {
  trigger: React.ReactNode;
  onComplete?: (banger: RecordedBanger) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SourceMode>("screen+cam");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [streamUid, setStreamUid] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<number | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const composedRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  // ---------- cleanup on close / unmount ----------
  useEffect(() => {
    if (!open) {
      resetAll();
    }
    return () => {
      stopAllTracks();
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopAllTracks() {
    [screenStreamRef.current, camStreamRef.current, composedRef.current].forEach(
      (s) => s?.getTracks().forEach((t) => t.stop()),
    );
    screenStreamRef.current = null;
    camStreamRef.current = null;
    composedRef.current = null;
  }

  function resetAll() {
    stopAllTracks();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setPhase("idle");
    setElapsed(0);
    setUploadProgress(0);
    setErrMsg(null);
    setStreamUid(null);
    setRecordingId(null);
  }

  // ---------- start recording flow ----------
  async function start() {
    setErrMsg(null);
    setPhase("permission");

    try {
      // 1. Get permission to media sources.
      let videoStream: MediaStream | null = null;
      let camStream: MediaStream | null = null;

      if (mode === "screen" || mode === "screen+cam") {
        videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true,
        });
        screenStreamRef.current = videoStream;
      }
      if (mode === "cam" || mode === "screen+cam") {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } },
          audio: true,
        });
        camStreamRef.current = camStream;
      }

      // 2. Pick the canonical stream we'll record from. For screen+cam we
      //    record the screen track + merge mic audio from cam; the cam video
      //    is shown as PiP only via the preview <video> element.
      const recordStream = new MediaStream();
      if (videoStream) {
        videoStream.getVideoTracks().forEach((t) => recordStream.addTrack(t));
        videoStream.getAudioTracks().forEach((t) => recordStream.addTrack(t));
      } else if (camStream) {
        camStream.getVideoTracks().forEach((t) => recordStream.addTrack(t));
      }
      if (camStream && mode !== "cam") {
        // mic audio from cam stream layered on top
        camStream.getAudioTracks().forEach((t) => recordStream.addTrack(t));
      } else if (camStream && mode === "cam") {
        camStream.getAudioTracks().forEach((t) => recordStream.addTrack(t));
      }
      composedRef.current = recordStream;

      // Wire preview video
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = camStream ?? videoStream;
        previewVideoRef.current.muted = true;
        previewVideoRef.current.play().catch(() => {});
      }

      // 3. Ask the backend for a tus upload URL.
      const r = await fetch("/api/recordings/upload-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDurationSeconds: MAX_DURATION_SECONDS }),
      });
      if (!r.ok) {
        throw new Error(`Could not get upload URL: ${r.status}`);
      }
      const { uploadUrl, streamUid: uid, recordingId: rid } = await r.json();
      setStreamUid(uid);
      setRecordingId(rid);

      // 4. Spin up the MediaRecorder.
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(
        recordStream,
        mime ? { mimeType: mime } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        await afterStop(uploadUrl);
      };
      recorder.start(1000); // collect chunks every 1s
      recorderRef.current = recorder;

      // Auto-stop if user-shares-system-screen gets revoked by clicking
      // browser's "Stop sharing" UI.
      if (videoStream) {
        videoStream.getVideoTracks().forEach((t) => {
          t.addEventListener("ended", () => {
            if (recorderRef.current?.state !== "inactive") stop();
          });
        });
      }

      // 5. Tick timer + auto-stop at MAX_DURATION_SECONDS.
      setPhase("recording");
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        setElapsed((e) => {
          const next = e + 1;
          if (next >= MAX_DURATION_SECONDS) {
            stop();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("[record] start failed", err);
      setPhase("error");
      setErrMsg(
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : "Could not start recording",
      );
      stopAllTracks();
    }
  }

  function stop() {
    if (phase !== "recording" && phase !== "paused") return;
    setPhase("stopping");
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* will trigger onstop */
      }
    }
    stopAllTracks();
  }

  function togglePause() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      setPhase("paused");
    } else if (rec.state === "paused") {
      rec.resume();
      setPhase("recording");
    }
  }

  // ---------- after recorder stops: multipart POST upload ----------
  // CF Stream's direct_upload returns a single-use URL that accepts a
  // multipart/form-data POST with a `file` field. We use XHR so the browser
  // surfaces upload progress events (fetch can't stream-upload + report
  // progress in any current browser without ReadableStream gating).
  async function afterStop(uploadUrl: string) {
    setPhase("uploading");
    setUploadProgress(0);

    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "video/webm",
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            reject(
              new Error(
                `Upload failed: HTTP ${xhr.status} ${xhr.responseText?.slice(0, 200) || ""}`,
              ),
            );
          }
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.onabort = () => reject(new Error("Upload aborted"));

        const fd = new FormData();
        const fileName = blob.type.includes("mp4") ? "banger.mp4" : "banger.webm";
        fd.append("file", blob, fileName);
        xhr.send(fd);
      });
    } catch (err) {
      console.error("[record] upload failed", err);
      setErrMsg(
        `Upload failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      setPhase("error");
      return;
    }

    setPhase("encoding");

    // Poll the finalize endpoint until the recording row flips to "ready".
    const uid = streamUid;
    if (!uid) return;
    await fetch(`/api/recordings/${uid}/finalize`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});

    for (let i = 0; i < 60; i++) {
      // up to ~2 min
      await new Promise((res) => setTimeout(res, 2000));
      const r = await fetch(`/api/recordings/${uid}`, {
        credentials: "include",
      });
      if (!r.ok) continue;
      const row = await r.json();
      if (row.status === "ready") {
        setPhase("ready");
        if (recordingId && row.embedUrl) {
          onComplete?.({
            recordingId,
            streamUid: uid,
            embedUrl: row.embedUrl,
            durationSec: row.durationSec || elapsed,
          });
          toast({
            title: "Banger ready",
            description: "Drop it into a post.",
          });
        }
        return;
      }
      if (row.status === "error") {
        setPhase("error");
        setErrMsg(row.errorMessage || "Encoding failed");
        return;
      }
    }

    // Timed out polling — still likely fine, just slow. Surface a soft toast.
    setPhase("ready");
    toast({
      title: "Banger uploaded",
      description:
        "Still encoding on Cloudflare. It'll appear in the feed in a minute.",
    });
  }

  // ---------- render ----------
  const fmt = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const remain = MAX_DURATION_SECONDS - elapsed;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[var(--b-purple,#7C3AED)]" />
            Record a banger
          </DialogTitle>
          <DialogDescription>
            Screen + cam recording, straight from your browser. Max 10 minutes.
            Nothing leaves your machine until you hit Stop.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Source</div>
            <div className="grid grid-cols-3 gap-2">
              <ModeChip
                active={mode === "screen+cam"}
                onClick={() => setMode("screen+cam")}
                icon={<Monitor className="h-4 w-4" />}
                label="Screen + cam"
              />
              <ModeChip
                active={mode === "screen"}
                onClick={() => setMode("screen")}
                icon={<Monitor className="h-4 w-4" />}
                label="Screen only"
              />
              <ModeChip
                active={mode === "cam"}
                onClick={() => setMode("cam")}
                icon={<Camera className="h-4 w-4" />}
                label="Cam only"
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Microphone audio will be captured
              from your default device.
            </p>
            <Button
              className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
              onClick={start}
            >
              <Video className="h-4 w-4 mr-2" />
              Start recording
            </Button>
          </div>
        )}

        {(phase === "recording" ||
          phase === "paused" ||
          phase === "permission") && (
          <div className="space-y-3">
            <div className="aspect-video rounded-xl bg-black overflow-hidden relative">
              <video
                ref={previewVideoRef}
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    phase === "recording" ? "bg-red-500 animate-pulse" : "bg-zinc-400"
                  }`}
                />
                <span className="text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                  {fmt(elapsed)} · {fmt(remain)} left
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={togglePause}
                disabled={phase === "permission"}
              >
                {phase === "paused" ? (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </>
                )}
              </Button>
              <Button
                className="flex-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                onClick={stop}
              >
                <Square className="h-4 w-4 mr-2" /> Stop
              </Button>
            </div>
          </div>
        )}

        {(phase === "stopping" || phase === "uploading" || phase === "encoding") && (
          <div className="space-y-3 text-center py-4">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-foreground" />
            <div className="text-sm font-semibold text-foreground">
              {phase === "stopping"
                ? "Wrapping up the recording..."
                : phase === "uploading"
                  ? `Uploading to Cloudflare · ${uploadProgress}%`
                  : "Encoding · this takes ~30 seconds"}
            </div>
            {phase === "uploading" && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-3 text-center py-4">
            <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500 text-white grid place-items-center">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Banger ready
            </div>
            <p className="text-xs text-muted-foreground">
              It's been added to your post composer. Hit Post when you're ready.
            </p>
            <Button
              className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-3 text-center py-4">
            <div className="text-sm font-semibold text-red-600">
              Recording failed
            </div>
            <p className="text-xs text-muted-foreground break-words">
              {errMsg ?? "Unknown error"}
            </p>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={resetAll}
            >
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Active chip uses the brand purple so it stays high-contrast across
// light/dark themes AND any forced-dark-mode browser extension. The earlier
// `bg-foreground` / `bg-card` pair both collapsed to the same color under
// Dark Reader-style inversion, which made all 3 chips look identical (and
// the modal felt unclickable). Inline hex avoids depending on CSS variables
// that the user's theme might be overriding.
function ModeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-semibold transition-all ${
        active
          ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-lg shadow-[#7C3AED]/30 ring-2 ring-[#7C3AED]/40 ring-offset-2 ring-offset-card"
          : "bg-card text-foreground border-border hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5"
      }`}
    >
      {active && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-white shadow ring-1 ring-[#7C3AED]" />
      )}
      {icon}
      <span>{label}</span>
    </button>
  );
}
