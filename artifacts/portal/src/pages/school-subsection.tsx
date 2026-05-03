import { useParams, Link } from "wouter";
import { useListLessons } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, CheckCircle2, Circle, FileText, Link as LinkIcon, Video, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

function getLessonIcon(type: string) {
  switch (type) {
    case "loom": return <Video className="h-4 w-4" />;
    case "pdf": return <FileText className="h-4 w-4" />;
    case "link": return <LinkIcon className="h-4 w-4" />;
    case "text": return <Type className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

export default function SchoolSubsectionPage() {
  const { id } = useParams();
  const subsectionId = parseInt(id || "0", 10);
  
  const { data: lessons, isLoading } = useListLessons(subsectionId, { 
    query: { enabled: !!subsectionId } 
  });

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-8">
        <Link href="/school">
          <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to School
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Subsection</h1>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {lessons?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No lessons available in this subsection yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lessons?.map((lesson, index) => (
              <Link key={lesson.id} href={`/school/lessons/${lesson.id}`}>
                <div className="group flex items-center justify-between p-4 hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      {lesson.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-mono mb-1 tracking-wider uppercase">Lesson {index + 1}</div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">{lesson.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground bg-background px-2 py-1 rounded border border-border text-xs uppercase tracking-wider font-semibold">
                    {getLessonIcon(lesson.type)}
                    <span>{lesson.type}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
