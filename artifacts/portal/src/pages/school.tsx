import { useListSegments, useGetMyProgress } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

const GRADIENTS = [
  "from-slate-700 via-slate-800 to-slate-900",
  "from-blue-700 via-blue-800 to-blue-950",
  "from-emerald-700 via-emerald-800 to-emerald-950",
  "from-purple-700 via-purple-800 to-purple-950",
  "from-rose-700 via-rose-800 to-rose-950",
  "from-amber-700 via-amber-800 to-amber-950",
  "from-cyan-700 via-cyan-800 to-cyan-950",
  "from-indigo-700 via-indigo-800 to-indigo-950",
  "from-orange-700 via-orange-800 to-orange-950",
];

function gradient(id: number) {
  return GRADIENTS[id % GRADIENTS.length]!;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {segments?.map((segment) => {
          const segmentProgress = progress?.bySegment.find(
            (s) => s.segmentId === segment.id,
          );
          const percent = Math.round(segmentProgress?.percent || 0);

          return (
            <Link key={segment.id} href={`/school/segments/${segment.id}`}>
              <article className="group bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-foreground/20 transition-all cursor-pointer">
                <div
                  className={`aspect-[16/9] bg-gradient-to-br ${gradient(segment.id)} relative flex items-center justify-center p-6`}
                >
                  <h3 className="text-white font-extrabold text-2xl text-center leading-tight uppercase tracking-tight drop-shadow-md">
                    {segment.title}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-1">
                    {segment.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {segment.subsectionCount} subsections · {segment.lessonCount} lessons
                  </p>
                  <ProgressBar percent={percent} />
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
            <span className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">
              1
            </span>
            <button
              disabled
              className="px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
          <span>1-{segments.length} of {segments.length}</span>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const complete = percent >= 100;
  return (
    <div className="relative h-6 rounded-full bg-muted overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 ${
          complete ? "bg-emerald-500" : "bg-emerald-500"
        } transition-all`}
        style={{ width: `${Math.max(percent, 0)}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-start px-3">
        <span
          className={`text-xs font-semibold ${
            percent > 12 ? "text-white" : "text-muted-foreground"
          }`}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}
