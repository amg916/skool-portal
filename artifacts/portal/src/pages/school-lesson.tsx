import { useParams, Link } from "wouter";
import { useGetLesson, useToggleLessonCompletion, getGetLessonQueryKey, getGetMyProgressQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, CheckCircle2, Circle, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SchoolLessonPage() {
  const { id } = useParams();
  const lessonId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lesson, isLoading } = useGetLesson(lessonId, { 
    query: { enabled: !!lessonId } 
  });
  
  const toggleCompletion = useToggleLessonCompletion();

  const handleToggle = () => {
    if (!lesson) return;
    const newStatus = !lesson.isCompleted;
    
    // Optimistic update
    queryClient.setQueryData(getGetLessonQueryKey(lessonId), { ...lesson, isCompleted: newStatus });
    
    toggleCompletion.mutate(
      { data: { completed: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLessonQueryKey(lessonId) });
          queryClient.invalidateQueries({ queryKey: getGetMyProgressQueryKey() });
          toast({ title: newStatus ? "Lesson completed!" : "Lesson marked incomplete" });
        },
        onError: () => {
          // Revert optimistic update
          queryClient.setQueryData(getGetLessonQueryKey(lessonId), lesson);
          toast({ title: "Error updating status", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading || !lesson) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const renderContent = () => {
    switch (lesson.type) {
      case "loom":
        if (!lesson.content) return null;
        // Basic loom embed logic
        const loomId = lesson.content.split('/').pop()?.split('?')[0];
        if (!loomId) return (
          <div className="p-8 text-center bg-muted rounded-lg">
            <a href={lesson.content} target="_blank" rel="noreferrer">
              <Button><ExternalLink className="h-4 w-4 mr-2" /> Open Video</Button>
            </a>
          </div>
        );
        return (
          <div className="relative w-full overflow-hidden rounded-lg shadow-md border border-border" style={{ paddingTop: '56.25%' }}>
            <iframe 
              src={`https://www.loom.com/embed/${loomId}`}
              frameBorder="0" 
              allowFullScreen 
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        );
      
      case "pdf":
        if (!lesson.uploadUrl) return null;
        return (
          <div className="flex flex-col items-center p-12 bg-muted/30 border border-border rounded-lg shadow-sm">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-4">PDF Document</h3>
            <a href={lesson.uploadUrl} target="_blank" rel="noreferrer" download>
              <Button size="lg">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </a>
          </div>
        );

      case "link":
        if (!lesson.content) return null;
        return (
          <div className="flex flex-col items-center p-12 bg-muted/30 border border-border rounded-lg shadow-sm">
            <LinkIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-4">External Resource</h3>
            <a href={lesson.content} target="_blank" rel="noreferrer">
              <Button size="lg" variant="default">
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

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/school/subsections/${lesson.subsectionId}`}>
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <Button 
          variant={lesson.isCompleted ? "outline" : "default"}
          onClick={handleToggle}
          disabled={toggleCompletion.isPending}
          className={lesson.isCompleted ? "text-primary border-primary bg-primary/5" : ""}
        >
          {lesson.isCompleted ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
          {lesson.isCompleted ? "Completed" : "Mark Complete"}
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{lesson.title}</h1>
      </div>

      <div className="mt-8">
        {renderContent()}
      </div>
      
      {/* Bottom completion toggle for long content */}
      {lesson.type === 'text' && (
        <div className="mt-12 flex justify-center border-t border-border pt-8">
          <Button 
            size="lg"
            variant={lesson.isCompleted ? "outline" : "default"}
            onClick={handleToggle}
            disabled={toggleCompletion.isPending}
            className={lesson.isCompleted ? "text-primary border-primary bg-primary/5" : ""}
          >
            {lesson.isCompleted ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <Circle className="h-5 w-5 mr-2" />}
            {lesson.isCompleted ? "Completed" : "Mark Complete"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Need to import missing icons
import { FileText, Link as LinkIcon } from "lucide-react";
