import { useEffect, useState } from "react";

type StepKey = "watch" | "try" | "post";
type StarterState = Record<StepKey, boolean> & { dismissed: boolean };

const STORAGE_KEY = "baingers_starter_v1";
const DEFAULT_STATE: StarterState = {
  watch: false,
  try: false,
  post: false,
  dismissed: false,
};

function readState(): StarterState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

const STEPS: ReadonlyArray<{
  key: StepKey;
  emoji: string;
  title: string;
  body: string;
  cta: string;
}> = [
  {
    key: "watch",
    emoji: "▶",
    title: "Watch your first banger",
    body: "The pinned welcome video, right below. Under 5 minutes.",
    cta: "Watch",
  },
  {
    key: "try",
    emoji: "🔧",
    title: "Try it on your machine",
    body: "Follow along and make the same thing yourself.",
    cta: "Mark done",
  },
  {
    key: "post",
    emoji: "✅",
    title: "Post what you made",
    body: 'Comment "I made this" to earn a green badge worth 2× on the leaderboard.',
    cta: "Post",
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
}

export function StarterCard({
  onWatchClick,
  onPostClick,
}: {
  onWatchClick?: () => void;
  onPostClick?: () => void;
}) {
  const [state, setState] = useState<StarterState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, hydrated]);

  if (!hydrated || state.dismissed) return null;

  const doneCount = STEPS.reduce((acc, s) => acc + (state[s.key] ? 1 : 0), 0);
  const allDone = doneCount === STEPS.length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  const toggleStep = (key: StepKey) => {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    if (!state[key]) {
      if (key === "watch") onWatchClick?.();
      if (key === "post") onPostClick?.();
    }
  };

  return (
    <div className="bc-starter mb-5">
      <button
        type="button"
        aria-label="Dismiss Start here"
        className="bc-starter-close"
        onClick={() => setState((prev) => ({ ...prev, dismissed: true }))}
      >
        ✕
      </button>

      <div className="px-6 pt-6 pb-4">
        <span className="bc-starter-badge">
          <span className="dot" />
          Founding member · you're early
        </span>
        <h2 className="text-[1.45rem] font-extrabold tracking-tight mt-3 leading-tight">
          Start here: the whole loop in one sitting
        </h2>
        <p className="text-white/75 text-[0.96rem] mt-1 max-w-[52ch] leading-relaxed">
          B<span className="ai-txt">ai</span>ngers is built around one habit:
          watch a short banger, try it today, post what you made. Knock out all
          three to light up your profile.
        </p>
      </div>

      <div className="flex items-center gap-3 px-6 pb-1">
        <div className="bc-progress-track">
          <div className="bc-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[12.5px] font-bold text-white/90 tabular-nums whitespace-nowrap">
          {allDone ? "All done 🎉" : `${doneCount} / ${STEPS.length}`}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {STEPS.map((s) => {
          const done = state[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleStep(s.key)}
              className={`bc-step-row ${done ? "done" : ""}`}
            >
              <span className="bc-step-check">
                <CheckIcon />
              </span>
              <span className="flex-1">
                <span className="bc-step-name flex items-center gap-2 font-bold text-[1rem] tracking-tight">
                  <span className="text-[1.05rem]" aria-hidden="true">
                    {s.emoji}
                  </span>
                  {s.title}
                </span>
                <span className="text-[12.5px] text-white/65 block mt-0.5">
                  {s.body}
                </span>
              </span>
              <span className="text-[13px] font-bold bg-white/15 rounded-full px-4 py-2 whitespace-nowrap">
                {done ? "Done" : s.cta}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
