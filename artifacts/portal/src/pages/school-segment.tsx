import { useParams, Link } from "wouter";
import {
  useListSegments,
  useListSubsections,
  useGetMyProgress,
} from "@workspace/api-client-react";
import { ChevronRight, Layers, Loader2, ArrowLeft } from "lucide-react";

export default function SchoolSegmentPage() {
  const { id } = useParams();
  const segmentId = parseInt(id || "0", 10);
  const { data: segments, isLoading: segLoading } = useListSegments();
  const { data: subsections, isLoading: subLoading } = useListSubsections(segmentId, {
    query: { enabled: !!segmentId },
  });
  const { data: progress } = useGetMyProgress();

  const segment = segments?.find((s) => s.id === segmentId);

  if (segLoading || subLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Link href="/school" className="inline-flex items-center text-sm text-foreground hover:underline mt-3">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Classroom
        </Link>
      </div>
    );
  }

  const segmentProgress = progress?.bySegment.find((s) => s.segmentId === segmentId);
  const percent = Math.round(segmentProgress?.percent || 0);

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-6">
      <Link
        href="/school"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Classroom
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{segment.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {segment.subsectionCount} subsections · {segment.lessonCount} lessons
          </span>
          {percent > 0 && (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                <span
                  className="block h-full bg-emerald-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-xs font-medium text-foreground">{percent}%</span>
            </span>
          )}
        </div>
      </header>

      <div className="space-y-2">
        {subsections?.map((sub) => (
          <Link key={sub.id} href={`/school/subsections/${sub.id}`}>
            <div className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-foreground/30 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">{sub.title}</div>
                  {sub.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {sub.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{sub.lessonCount} lessons</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {subsections?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
          No content in this course yet.
        </div>
      )}
    </div>
  );
}
