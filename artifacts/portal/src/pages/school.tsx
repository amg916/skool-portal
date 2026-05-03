import { useListSegments, useGetMyProgress } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ChevronRight, Layers, PlayCircle, FileText, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useListSubsections } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

function SegmentAccordion({ segmentId }: { segmentId: number }) {
  const { data: subsections, isLoading } = useListSubsections(segmentId, { query: { enabled: !!segmentId } });

  if (isLoading) return <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!subsections?.length) return <div className="p-4 text-sm text-muted-foreground">No content in this segment yet.</div>;

  return (
    <div className="grid gap-2 p-2">
      {subsections.map(sub => (
        <Link key={sub.id} href={`/school/subsections/${sub.id}`}>
          <div className="group flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-background p-2 rounded text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm group-hover:text-primary transition-colors">{sub.title}</div>
                {sub.description && <div className="text-xs text-muted-foreground line-clamp-1">{sub.description}</div>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {sub.lessonCount} lessons
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function SchoolPage() {
  const { data: segments, isLoading: segmentsLoading } = useListSegments();
  const { data: progress, isLoading: progressLoading } = useGetMyProgress();

  if (segmentsLoading || progressLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">School</h1>
        <p className="text-muted-foreground">Master the curriculum at your own pace.</p>
      </div>

      {progress && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground">Your Progress</h3>
                <p className="text-sm text-muted-foreground">
                  You've completed {progress.completedLessons} out of {progress.totalLessons} lessons
                </p>
              </div>
              <div className="w-full md:w-1/2 space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-primary">{Math.round(progress.overallPercent)}%</span>
                </div>
                <Progress value={progress.overallPercent} className="h-2 bg-primary/20" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Accordion type="multiple" className="w-full space-y-4">
          {segments?.map(segment => {
            const segmentProgress = progress?.bySegment.find(s => s.segmentId === segment.id);
            const percent = segmentProgress?.percent || 0;

            return (
              <AccordionItem key={segment.id} value={`segment-${segment.id}`} className="border rounded-lg bg-card overflow-hidden data-[state=open]:ring-1 ring-border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4 text-left w-full">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{segment.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {segment.subsectionCount} subsections • {segment.lessonCount} lessons
                        </span>
                        {percent > 0 && (
                          <div className="flex items-center gap-2 ml-4">
                            <Progress value={percent} className="w-24 h-1.5 bg-muted-foreground/20" />
                            <span className="text-[10px] font-medium text-muted-foreground">{Math.round(percent)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-card pt-0 pb-2 px-4 border-t border-border">
                  <SegmentAccordion segmentId={segment.id} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
