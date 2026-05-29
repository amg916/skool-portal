import { useListSegments, useGetMyProgress } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Loader2,
  Rocket,
  Settings,
  Megaphone,
  GraduationCap,
  Trophy,
  Brain,
  Wrench,
  Wand2,
  Code,
  Compass,
  Sparkles,
  Target,
  TrendingUp,
  Layers,
  type LucideIcon,
} from "lucide-react";

const GRADIENTS = [
  "from-[#1e3a8a] via-[#1e293b] to-[#0f172a]",
  "from-[#1e40af] via-[#1e293b] to-[#020617]",
  "from-[#0f766e] via-[#134e4a] to-[#042f2e]",
  "from-[#581c87] via-[#3b0764] to-[#1e1b4b]",
  "from-[#9f1239] via-[#500724] to-[#1f0710]",
  "from-[#92400e] via-[#451a03] to-[#1c0a02]",
  "from-[#155e75] via-[#164e63] to-[#083344]",
  "from-[#3730a3] via-[#1e1b4b] to-[#020617]",
  "from-[#9a3412] via-[#431407] to-[#1c0a02]",
];

const ICON_POOL: ReadonlyArray<LucideIcon> = [
  Rocket,
  Settings,
  Megaphone,
  GraduationCap,
  Trophy,
  Brain,
  Wrench,
  Wand2,
  Code,
  Compass,
  Sparkles,
  Target,
  TrendingUp,
  Layers,
];

function gradient(id: number) {
  return GRADIENTS[id % GRADIENTS.length]!;
}

function iconFor(title: string, id: number): LucideIcon {
  const t = title.toLowerCase();
  if (/(start|begin|welcome|intro|onboard)/.test(t)) return Rocket;
  if (/(setup|setting|configure|install)/.test(t)) return Settings;
  if (/(ad|market|growth|funnel|campaign)/.test(t)) return Megaphone;
  if (/(class|lesson|course|learn|school|study)/.test(t)) return GraduationCap;
  if (/(scale|scaling|grow|growth)/.test(t)) return TrendingUp;
  if (/(prompt|ai|model|llm|claude|gpt)/.test(t)) return Brain;
  if (/(tool|build|wrench|fix)/.test(t)) return Wrench;
  if (/(prompt|magic|wand|wizard)/.test(t)) return Wand2;
  if (/(code|dev|engineer|programming)/.test(t)) return Code;
  if (/(roadmap|guide|nav|compass|map)/.test(t)) return Compass;
  if (/(banger|featured|new|trend|spotlight)/.test(t)) return Sparkles;
  if (/(goal|target|focus)/.test(t)) return Target;
  if (/(stack|layer|module)/.test(t)) return Layers;
  if (/(reward|win|trophy|leaderboard)/.test(t)) return Trophy;
  return ICON_POOL[id % ICON_POOL.length]!;
}

export default function SchoolPage() {
  const { data: segments, isLoading: segmentsLoading } = useListSegments();
  const { data: progress, isLoading: progressLoading } = useGetMyProgress();

  if (segmentsLoading || progressLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments?.map((segment) => {
          const segmentProgress = progress?.bySegment.find(
            (s) => s.segmentId === segment.id,
          );
          const percent = Math.round(segmentProgress?.percent || 0);
          const Icon = iconFor(segment.title, segment.id);
          const description =
            (segment as { description?: string | null }).description?.trim() ||
            `${segment.subsectionCount} subsections · ${segment.lessonCount} lessons`;

          return (
            <Link key={segment.id} href={`/school/segments/${segment.id}`}>
              <article className="group bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-foreground/20 transition-all cursor-pointer flex flex-col">
                <div
                  className={`relative aspect-[16/10] bg-gradient-to-br ${gradient(segment.id)} flex flex-col items-center justify-center px-8 py-7 overflow-hidden`}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)",
                    }}
                  />
                  <h3 className="relative z-10 text-white font-extrabold text-[1.55rem] sm:text-[1.75rem] text-center leading-[1.05] uppercase tracking-[-0.02em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                    {segment.title}
                  </h3>
                  <Icon
                    className="relative z-10 mt-4 h-12 w-12 sm:h-14 sm:w-14 text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                    strokeWidth={1.6}
                  />
                </div>
                <div className="p-4 pt-4 space-y-3 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-[1.02rem] leading-snug line-clamp-1">
                    {segment.title}
                  </h3>
                  <p className="text-[13.5px] text-muted-foreground line-clamp-2 min-h-[2.6rem] leading-[1.45]">
                    {description}
                  </p>
                  <div className="mt-auto pt-1">
                    <ProgressBar percent={percent} />
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {segments?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <p className="font-medium text-foreground">No courses yet</p>
          <p className="text-sm mt-1">An admin will add content here soon.</p>
        </div>
      )}

      {segments && segments.length > 0 && (
        <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <button
              disabled
              className="px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              ‹ Previous
            </button>
            <span className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-semibold">
              1
            </span>
            <button
              disabled
              className="px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
          <span>
            1-{segments.length} of {segments.length}
          </span>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent));
  return (
    <div className="relative h-[26px] rounded-full bg-muted overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
        style={{ width: `${safe}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-start px-3">
        <span
          className={`text-[12px] font-bold tabular-nums ${
            safe > 14 ? "text-white" : "text-foreground/70"
          }`}
        >
          {safe}%
        </span>
      </div>
    </div>
  );
}
