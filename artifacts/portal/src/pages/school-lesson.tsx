import { useParams, Link } from "wouter";
import { useGetLesson } from "@workspace/api-client-react";
import { ArrowLeft, Loader2, CheckCircle2, Circle, ExternalLink, Download, FileText, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToggleLessonCompletion } from "@/hooks/useToggleLessonCompletion";

export default function SchoolLessonPage() {
  const { id } = useParams();
  const lessonId = parseInt(id || "0", 10);

  const { data: lesson, isLoading } = useGetLesson(lessonId, { 
    query: { enabled: !!lessonId } 
  });
  
  const { toggle, isPending } = useToggleLessonCompletion(lessonId);

  const handleToggle = () => {
    if (!lesson) return;
    toggle({ isCompleted: lesson.isCompleted });
  };

  if (isLoading || !lesson) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const renderContent = () => {
    switch (lesson.type) {
      case "loom": {
        if (!lesson.content) return null;
        const loomId = lesson.content.split('/').pop()?.split('?')[0];
        if (!loomId) return (
          <div className="p-8 text-center bg-muted rounded-lg">
            <a href={lesson.content} target="_blank" rel="noreferrer">
              <Button aria-label="Open video in new tab"><ExternalLink className="h-4 w-4 mr-2" /> Open Video</Button>
            </a>
          </div>
        );
        return (
          <div className="relative w-full overflow-hidden rounded-lg shadow-md border border-border" style={{ paddingTop: '56.25%' }}>
            <iframe 
              src={`https://www.loom.com/embed/${loomId}`}
              title={lesson.title}
              frameBorder="0" 
              allowFullScreen 
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        );
      }
      
      case "pdf":
        if (!lesson.uploadUrl) return null;
        return (
          <div className="flex flex-col items-center p-12 bg-muted/30 border border-border rounded-lg shadow-sm">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-4">PDF Document</h3>
            <a href={lesson.uploadUrl} target="_blank" rel="noreferrer" download>
              <Button size="lg" aria-label="Download PDF document">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </a>
          </div>
        );

      case "link":
        if (!lesson.content) return null;
        return (
          <div className="flex flex-col items-center p-12 bg-muted/30 border border-border rounded-lg shadow-sm">
            <LinkIcon className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-4">External Resource</h3>
            <a href={lesson.content} target="_blank" rel="noreferrer">
              <Button size="lg" variant="default" aria-label="Open external resource in new tab">
                <ExternalLink className="h-4 w-4 mr-2" /> Open Link
              </Button>
            </a>
          </div>
        );

      case "text":
        return (
          <div className="prose prose-slate dark:prose-invert max-w-none bg-card p-8 rounded-lg border border-border shadow-sm whitespace-pre-wrap">
            {lesson.content}
          </div>
        );

      default:
        return null;
    }
  };

  const completionLabel = lesson.isCompleted ? "Mark lesson incomplete" : "Mark lesson complete";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/school/subsections/${lesson.subsectionId}`}>
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back to subsection">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <Button 
          variant={lesson.isCompleted ? "outline" : "default"}
          onClick={handleToggle}
          disabled={isPending}
          aria-label={completionLabel}
          aria-pressed={lesson.isCompleted}
          className={`rounded-full focus-visible:ring-2 focus-visible:ring-ring ${lesson.isCompleted ? "border-[var(--b-green)] text-[var(--b-green-600)] bg-[var(--b-green-50)] hover:bg-[var(--b-green-50)]" : "bg-foreground text-background hover:bg-foreground/90"}`}
        >
          {lesson.isCompleted ? <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" /> : <Circle className="h-4 w-4 mr-2" aria-hidden="true" />}
          {lesson.isCompleted ? "Completed" : "Mark Complete"}
        </Button>
      </div>

      <div className="mb-8">
        <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--b-blue)]">
          Lesson
        </span>
        <h1 className="text-[2.1rem] font-extrabold tracking-tight text-foreground mt-1 leading-[1.1]">
          {lesson.title}
        </h1>
      </div>

      <div className="mt-8">
        {renderContent()}
      </div>
      
      {lesson.type === 'text' && (
        <div className="mt-12 flex justify-center border-t border-border pt-8">
          <Button 
            size="lg"
            variant={lesson.isCompleted ? "outline" : "default"}
            onClick={handleToggle}
            disabled={isPending}
            aria-label={completionLabel}
            aria-pressed={lesson.isCompleted}
            className={`rounded-full focus-visible:ring-2 focus-visible:ring-ring ${lesson.isCompleted ? "border-[var(--b-green)] text-[var(--b-green-600)] bg-[var(--b-green-50)] hover:bg-[var(--b-green-50)]" : "bg-foreground text-background hover:bg-foreground/90"}`}
          >
            {lesson.isCompleted ? <CheckCircle2 className="h-5 w-5 mr-2" aria-hidden="true" /> : <Circle className="h-5 w-5 mr-2" aria-hidden="true" />}
            {lesson.isCompleted ? "Completed" : "Mark Complete"}
          </Button>
        </div>
      )}
    </div>
  );
}
