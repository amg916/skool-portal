import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// -----------------------------------------------------------------------------
// RecordButton — Loom-style in-app screen+cam recorder.
//
// Phases:
//   idle       → centered modal: source picker
//   permission → centered modal: spinner while getDisplayMedia / getUserMedia resolves
//   recording  → small floating widget bottom-right (non-blocking, page interactable)
//   paused     → same widget, with Resume button
//   stopping   → modal: "wrapping up"
//   uploading  → modal: progress bar (CF Stream upload)
//   encoding   → modal: spinner ("CF is encoding")
//   ready      → modal: ✓ banger ready (also auto-populates composer videoUrl)
//   error      → modal: error + try again
//
// Key invariants:
//   - During recording/paused, the page is FULLY interactable — no overlay.
//   - Stop is reliable: we requestData() to flush before stop(), then defer
//     stopAllTracks() until inside recorder.onstop.
//   - uploadUrl lives in a ref so the stop+upload path doesn't depend on
//     React state being current.
//   - For screen+cam mode we composite the cam onto a canvas as a Loom-style
//     bubble, so the bake-in cam is part of the recorded video itself.
// -----------------------------------------------------------------------------

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

  // Refs persist across renders — never depend on React state for the
  // recorder pipeline. State is for the UI only.
  const screenStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const composedRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const uploadUrlRef = useRef<string | null>(null);
  const streamUidRef = useRef<string | null>(null);
  const recordingIdRef = useRef<number | null>(null);
  const canvasAnimRef = useRef<number | null>(null);
  const screenVidElRef = useRef<HTMLVideoElement | null>(null);
  const camVidElRef = useRef<HTMLVideoElement | null>(null);
  const camPreviewRef = useRef<HTMLVideoElement | null>(null);
  // Large live cam preview rendered at bottom-left of the viewport so you can
  // see yourself while recording. Mirrors the cam stream — purely visual,
  // independent of the canvas compositor that bakes the bubble into the file.
  const liveCamRef = useRef<HTMLVideoElement | null>(null);

  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  const stopAllTracks = useCallback(() => {
    [
      screenStreamRef.current,
      camStreamRef.current,
      composedRef.current,
    ].forEach((s) => s?.getTracks().forEach((t) => t.stop()));
    screenStreamRef.current = null;
    camStreamRef.current = null;
    composedRef.current = null;
    if (canvasAnimRef.current != null) {
      cancelAnimationFrame(canvasAnimRef.current);
      canvasAnimRef.current = null;
    }
    screenVidElRef.current = null;
    camVidElRef.current = null;
  }, []);

  const resetAll = useCallback(() => {
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
    uploadUrlRef.current = null;
    streamUidRef.current = null;
    recordingIdRef.current = null;
    setPhase("idle");
    setElapsed(0);
    setUploadProgress(0);
    setErrMsg(null);
  }, [stopAllTracks]);

  // On modal close (X button or backdrop), reset everything UNLESS we're mid
  // recording — closing the X during recording should NOT cancel the recording.
  function tryClose() {
    if (phase === "recording" || phase === "paused") return; // ignore
    if (phase === "uploading" || phase === "encoding") return; // don't cancel mid-upload either
    setOpen(false);
  }

  useEffect(() => {
    if (!open) resetAll();
    return () => {
      stopAllTracks();
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes modal (but not during recording).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") tryClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  // Wire the cam stream into BOTH live preview elements (the big bottom-left
  // bubble and the small widget thumbnail) AFTER they mount. We previously
  // tried to do this from inside start() via requestAnimationFrame, but the
  // portal-rendered video elements weren't in the DOM yet when RAF fired, so
  // the ref was null and srcObject never got set — blank black bubble.
  // useEffect runs after React commits, which guarantees the refs exist.
  useEffect(() => {
    if (phase !== "recording" && phase !== "paused") return;
    const cam = camStreamRef.current;
    if (!cam) return;
    // Both video elements share the same MediaStream — that's fine, the
    // browser fans out frames to every consumer.
    if (liveCamRef.current && liveCamRef.current.srcObject !== cam) {
      liveCamRef.current.srcObject = cam;
      liveCamRef.current.muted = true;
      liveCamRef.current.play().catch(() => {});
    }
    if (camPreviewRef.current && camPreviewRef.current.srcObject !== cam) {
      camPreviewRef.current.srcObject = cam;
      camPreviewRef.current.muted = true;
      camPreviewRef.current.play().catch(() => {});
    }
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  async function start() {
    setErrMsg(null);
    setPhase("permission");

    try {
      // 1. Acquire media streams.
      let screenStream: MediaStream | null = null;
      let camStream: MediaStream | null = null;

      if (mode === "screen" || mode === "screen+cam") {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true, // system audio (optional, Chrome/Edge only)
        });
        screenStreamRef.current = screenStream;
      }
      if (mode === "cam" || mode === "screen+cam") {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        camStreamRef.current = camStream;
      }

      // 2. Build the stream that the MediaRecorder will actually record.
      //    For screen+cam mode we composite the cam onto a canvas (Loom-style
      //    bubble) so the cam is BAKED INTO the recording, not just preview.
      let recordStream: MediaStream;
      if (mode === "screen+cam" && screenStream && camStream) {
        recordStream = await buildCompositeStream(screenStream, camStream);
      } else if (mode === "screen" && screenStream) {
        recordStream = new MediaStream();
        screenStream.getVideoTracks().forEach((t) => recordStream.addTrack(t));
        screenStream.getAudioTracks().forEach((t) => recordStream.addTrack(t));
      } else if (mode === "cam" && camStream) {
        recordStream = new MediaStream();
        camStream.getVideoTracks().forEach((t) => recordStream.addTrack(t));
        camStream.getAudioTracks().forEach((t) => recordStream.addTrack(t));
      } else {
        throw new Error("Could not build recording stream");
      }
      composedRef.current = recordStream;

      // NOTE: cam preview elements (the bottom-left live bubble and the
      // floating widget thumbnail) are wired in a useEffect that fires after
      // React mounts the portal — see useEffect on [phase] above. Doing it
      // here races the portal mount and leaves a blank video element.

      // 3. Mint upload URL from backend.
      const r = await fetch("/api/recordings/upload-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDurationSeconds: MAX_DURATION_SECONDS }),
      });
      if (!r.ok) {
        throw new Error(`Could not get upload URL: ${r.status}`);
      }
      const { uploadUrl, streamUid, recordingId } = await r.json();
      uploadUrlRef.current = uploadUrl;
      streamUidRef.current = streamUid;
      recordingIdRef.current = recordingId;

      // 4. MediaRecorder.
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=h264,opus",
        "video/webm",
        "video/mp4",
      ];
      const mime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(
        recordStream,
        mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        // Tracks are stopped here, AFTER all data has been collected.
        stopAllTracks();
        const url = uploadUrlRef.current;
        if (!url) {
          setPhase("error");
          setErrMsg("Upload URL was lost");
          return;
        }
        await afterStop(url);
      };
      recorder.onerror = (e) => {
        console.error("[record] recorder error", e);
        setPhase("error");
        setErrMsg("Recorder failed mid-recording");
        stopAllTracks();
      };

      // start with 1s timeslice = ondataavailable fires every 1s, so even if
      // the user closes the tab mid-recording we have data up to last second.
      recorder.start(1000);
      recorderRef.current = recorder;

      // Browser native "Stop sharing" pill → fires `ended` on the screen video
      // track. Auto-stop our recorder when that happens.
      if (screenStream) {
        screenStream.getVideoTracks().forEach((t) => {
          t.addEventListener("ended", () => {
            if (recorderRef.current?.state !== "inactive") stop();
          });
        });
      }

      // 5. Timer + auto-stop at MAX_DURATION_SECONDS.
      setPhase("recording");
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SECONDS) stop();
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("[record] start failed", err);
      const name = err instanceof Error ? err.name : "Error";
      const msg = err instanceof Error ? err.message : String(err);
      let friendly = msg;
      if (name === "NotAllowedError") {
        friendly =
          "Permission denied. On macOS you may need to grant Chrome screen-recording permission in System Settings → Privacy & Security → Screen Recording, then restart Chrome.";
      } else if (name === "NotFoundError") {
        friendly = "Could not find a camera/microphone on this device.";
      }
      setPhase("error");
      setErrMsg(friendly);
      stopAllTracks();
    }
  }

  // ---------------------------------------------------------------------------
  // Build composite stream (screen + cam bubble baked into a canvas stream)
  // ---------------------------------------------------------------------------
  async function buildCompositeStream(
    screenStream: MediaStream,
    camStream: MediaStream,
  ): Promise<MediaStream> {
    const screenTrack = screenStream.getVideoTracks()[0]!;
    const settings = screenTrack.getSettings();
    const w = settings.width || 1280;
    const h = settings.height || 720;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // Off-DOM video elements feed the canvas.
    const screenVid = document.createElement("video");
    screenVid.srcObject = screenStream;
    screenVid.muted = true;
    screenVid.playsInline = true;
    await screenVid.play().catch(() => {});
    screenVidElRef.current = screenVid;

    const camVid = document.createElement("video");
    camVid.srcObject = camStream;
    camVid.muted = true;
    camVid.playsInline = true;
    await camVid.play().catch(() => {});
    camVidElRef.current = camVid;

    // Cam bubble: bottom-left, ~32% of screen width (big like Loom),
    // circular crop, purple ring.
    function draw() {
      try {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        if (screenVid.readyState >= 2) {
          ctx.drawImage(screenVid, 0, 0, w, h);
        }
        if (camVid.readyState >= 2 && camVid.videoWidth > 0) {
          const camDiameter = Math.round(w * 0.32);
          const cx = 40 + camDiameter / 2;
          const cy = h - camDiameter / 2 - 40;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, camDiameter / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          // cover-fit the cam frame into the circle
          const camAr = camVid.videoWidth / camVid.videoHeight;
          let dw = camDiameter;
          let dh = camDiameter;
          if (camAr > 1) {
            dw = camDiameter * camAr;
          } else {
            dh = camDiameter / camAr;
          }
          ctx.drawImage(camVid, cx - dw / 2, cy - dh / 2, dw, dh);
          ctx.restore();
          // purple ring
          ctx.strokeStyle = "#7C3AED";
          ctx.lineWidth = Math.max(4, w * 0.004);
          ctx.beginPath();
          ctx.arc(cx, cy, camDiameter / 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      } catch {
        /* keep loop alive even on transient errors */
      }
      canvasAnimRef.current = requestAnimationFrame(draw);
    }
    draw();

    // Capture composited canvas + mix mic audio (and screen audio if present).
    const canvasStream = (canvas as HTMLCanvasElement).captureStream(30);
    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach((t) => finalStream.addTrack(t));

    // Mix all audio tracks via AudioContext so MediaRecorder receives a single
    // merged audio track. Adding multiple raw tracks to a MediaStream silently
    // drops all but the first in most browsers.
    const allAudioTracks = [
      ...camStream.getAudioTracks(),
      ...screenStream.getAudioTracks(),
    ];
    if (allAudioTracks.length === 1) {
      finalStream.addTrack(allAudioTracks[0]!);
    } else if (allAudioTracks.length > 1) {
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      allAudioTracks.forEach((track) => {
        const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
        src.connect(dest);
      });
      dest.stream.getAudioTracks().forEach((t) => finalStream.addTrack(t));
    }
    return finalStream;
  }

  // ---------------------------------------------------------------------------
  // Stop / Pause
  // ---------------------------------------------------------------------------
  function stop() {
    if (phase !== "recording" && phase !== "paused") return;
    setPhase("stopping");
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        // Flush any in-flight data BEFORE stop, so the final chunk lands.
        rec.requestData();
      } catch {
        /* ignore — some browsers throw if no data */
      }
      try {
        rec.stop();
      } catch (e) {
        console.error("[record] rec.stop() threw", e);
      }
    } else {
      // No active recorder — try afterStop directly if we have URL + chunks.
      const url = uploadUrlRef.current;
      if (url && chunksRef.current.length > 0) {
        stopAllTracks();
        afterStop(url);
      } else {
        setPhase("error");
        setErrMsg("Could not stop cleanly — please try again.");
      }
    }
    // Note: stopAllTracks() happens INSIDE recorder.onstop (above) so we
    // don't race the recorder's final data event.
  }

  function togglePause() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      setPhase("paused");
      // Stop the elapsed timer while paused.
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    } else if (rec.state === "paused") {
      rec.resume();
      setPhase("recording");
      // Restart the elapsed timer.
      tickRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SECONDS) stop();
          return next;
        });
      }, 1000);
    }
  }

  // ---------------------------------------------------------------------------
  // After stop: upload to CF Stream + poll for ready
  // ---------------------------------------------------------------------------
  async function afterStop(uploadUrl: string) {
    setPhase("uploading");
    setUploadProgress(0);

    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "video/webm",
    });
    if (blob.size === 0) {
      setPhase("error");
      setErrMsg("Recording was empty — nothing to upload.");
      return;
    }

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
        const fileName = blob.type.includes("mp4")
          ? "banger.mp4"
          : "banger.webm";
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

    const uid = streamUidRef.current;
    if (!uid) return;
    await fetch(`/api/recordings/${uid}/finalize`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});

    // Poll for ready up to ~2 minutes.
    for (let i = 0; i < 60; i++) {
      await new Promise((res) => setTimeout(res, 2000));
      const r = await fetch(`/api/recordings/${uid}`, {
        credentials: "include",
      });
      if (!r.ok) continue;
      const row = await r.json();
      if (row.status === "ready") {
        setPhase("ready");
        const rid = recordingIdRef.current;
        if (rid && row.embedUrl) {
          onComplete?.({
            recordingId: rid,
            streamUid: uid,
            embedUrl: row.embedUrl,
            durationSec: row.durationSec || elapsed,
          });
          toast({
            title: "Banger ready",
            description: "Dropped into your post composer.",
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

    // Polling timeout — still likely encoding. Soft success.
    setPhase("ready");
    toast({
      title: "Banger uploaded",
      description:
        "Still encoding on Cloudflare. It'll appear in your feed in a minute.",
    });
    const rid = recordingIdRef.current;
    if (rid) {
      onComplete?.({
        recordingId: rid,
        streamUid: uid,
        embedUrl: `https://customer-xu3qlilubd087z7q.cloudflarestream.com/${uid}/iframe?preload=metadata`,
        durationSec: elapsed,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const fmt = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const remain = MAX_DURATION_SECONDS - elapsed;

  const isFloating = phase === "recording" || phase === "paused";
  const showModal = open && !isFloating;

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      {/* Centered modal (all phases except recording/paused) */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={tryClose}
            />
            {/* Card */}
            <div className="relative z-10 w-full max-w-[480px] rounded-2xl bg-card border border-border p-5 shadow-2xl">
              {/* Close X (only visible if closing is allowed) */}
              {phase !== "uploading" && phase !== "encoding" && (
                <button
                  type="button"
                  onClick={tryClose}
                  aria-label="Close"
                  className="absolute top-3 right-3 h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Title + description shown in idle/permission only */}
              {(phase === "idle" || phase === "permission") && (
                <div className="mb-4 pr-8">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Video className="h-5 w-5 text-[#7C3AED]" />
                    Record a banger
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Screen + cam, straight from your browser. Max 10 minutes.
                    When you hit Stop the modal shrinks to a tiny widget so you
                    can keep working.
                  </p>
                </div>
              )}

              {/* IDLE — source picker */}
              {phase === "idle" && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-foreground">
                    Source
                  </div>
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
                    <Mic className="h-3.5 w-3.5" /> Mic audio captured from your
                    default device.
                  </p>
                  <button
                    type="button"
                    onClick={start}
                    className="w-full rounded-full bg-[#7C3AED] text-white text-sm font-semibold py-2.5 hover:bg-[#6d2fd1] transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Start recording
                  </button>
                </div>
              )}

              {/* PERMISSION — spinner */}
              {phase === "permission" && (
                <div className="py-6 text-center">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#7C3AED]" />
                  <div className="text-sm font-semibold text-foreground mt-3">
                    Pick what to share…
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your browser is asking which screen/window/tab to capture.
                  </p>
                </div>
              )}

              {/* STOPPING / UPLOADING / ENCODING — progress */}
              {(phase === "stopping" ||
                phase === "uploading" ||
                phase === "encoding") && (
                <div className="space-y-3 text-center py-4">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#7C3AED]" />
                  <div className="text-sm font-semibold text-foreground">
                    {phase === "stopping"
                      ? "Wrapping up the recording…"
                      : phase === "uploading"
                        ? `Uploading to Cloudflare · ${uploadProgress}%`
                        : "Encoding · this takes ~30 seconds"}
                  </div>
                  {phase === "uploading" && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7C3AED] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* READY */}
              {phase === "ready" && (
                <div className="space-y-3 text-center py-4">
                  <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500 text-white grid place-items-center">
                    <Check className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Banger ready
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Embedded into your post composer. Hit Post when you're done
                    writing.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-full bg-[#7C3AED] text-white text-sm font-semibold py-2.5 hover:bg-[#6d2fd1] transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* ERROR */}
              {phase === "error" && (
                <div className="space-y-3 text-center py-4">
                  <div className="h-10 w-10 mx-auto rounded-full bg-red-500/15 text-red-500 grid place-items-center">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-red-500">
                    Recording failed
                  </div>
                  <p className="text-xs text-muted-foreground break-words text-left bg-muted/30 rounded-lg p-3">
                    {errMsg ?? "Unknown error"}
                  </p>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="w-full rounded-full bg-foreground text-background text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Large live cam bubble — bottom-left of viewport so you can see
          yourself while recording. Only rendered when a cam stream exists
          (screen+cam or cam-only modes). pointer-events:none so it never
          blocks clicks underneath. */}
      {isFloating &&
        camStreamRef.current &&
        createPortal(
          <div
            className="fixed bottom-6 left-6 z-[99] pointer-events-none"
            aria-hidden="true"
          >
            <div className="relative h-[220px] w-[220px] rounded-full overflow-hidden border-4 border-[#7C3AED] shadow-2xl shadow-[#7C3AED]/40 bg-black ring-2 ring-white/20">
              <video
                ref={liveCamRef}
                autoPlay
                playsInline
                muted
                // Mirror the cam horizontally so it feels like a mirror,
                // matching how every video conferencing tool shows your own
                // feed. (CF Stream will record the un-mirrored canvas — only
                // the live preview is flipped.)
                style={{ transform: "scaleX(-1)" }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>,
          document.body,
        )}

      {/* Floating widget — recording / paused. NO backdrop. Page interactable. */}
      {isFloating &&
        createPortal(
          <div
            className="fixed bottom-4 right-4 z-[100] bg-card border-2 border-[#7C3AED] rounded-2xl shadow-2xl shadow-[#7C3AED]/30 p-2.5 flex items-center gap-3 select-none"
            role="region"
            aria-label="Recording controls"
            style={{ minWidth: 320 }}
          >
            {/* Cam thumbnail (if cam stream exists — screen+cam or cam-only) */}
            {camStreamRef.current && (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black border border-border flex-shrink-0">
                <video
                  ref={camPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}

            {/* Live indicator + timer */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    phase === "recording"
                      ? "bg-red-500 animate-pulse"
                      : "bg-zinc-400"
                  }`}
                />
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {phase === "recording" ? "Recording" : "Paused"}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground tabular-nums leading-tight">
                {fmt(elapsed)}
                <span className="text-xs font-medium text-muted-foreground ml-1">
                  / {fmt(MAX_DURATION_SECONDS)}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {fmt(remain)} left
              </div>
            </div>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={togglePause}
              aria-label={phase === "paused" ? "Resume recording" : "Pause recording"}
              title={phase === "paused" ? "Resume" : "Pause"}
              className="h-9 w-9 rounded-full bg-muted hover:bg-muted/70 grid place-items-center text-foreground flex-shrink-0"
            >
              {phase === "paused" ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>

            {/* Stop */}
            <button
              type="button"
              onClick={stop}
              aria-label="Stop recording"
              title="Stop & save"
              className="h-9 px-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
            >
              <Square className="h-3.5 w-3.5 fill-white" />
              Stop
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

// -----------------------------------------------------------------------------
// ModeChip — active state uses inline brand purple so forced-dark-mode browser
// extensions can't collapse it to the same color as inactive chips.
// -----------------------------------------------------------------------------
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
