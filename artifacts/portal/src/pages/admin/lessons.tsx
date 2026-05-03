import { useState } from "react";
import { Link } from "wouter";
import { 
  useListSegments, 
  useListSubsections,
  useListLessons,
  useCreateLesson, 
  useUpdateLesson, 
  useDeleteLesson,
  useReorderLesson,
  getListLessonsQueryKey,
  ReorderRequestDirection,
  CreateLessonRequestType,
  LessonType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, ArrowLeft, Loader2, ArrowUp, ArrowDown, Pencil, Trash2, Video, Link as LinkIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { usePdfUpload } from "@/hooks/usePdfUpload";

function getLessonIcon(type: string) {
  switch (type) {
    case "loom": return <Video className="h-4 w-4" />;
    case "pdf": return <FileText className="h-4 w-4" />;
    case "link": return <LinkIcon className="h-4 w-4" />;
    case "text": return <Type className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

export default function AdminLessons() {
  const { data: segments } = useListSegments();
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | "">("");

  const { data: subsections } = useListSubsections(
    selectedSegmentId as number, 
    { query: { enabled: !!selectedSegmentId } }
  );

  const [selectedSubsectionId, setSelectedSubsectionId] = useState<number | "">("");

  const { data: lessons, isLoading: lessonsLoading } = useListLessons(
    selectedSubsectionId as number, 
    { query: { enabled: !!selectedSubsectionId } }
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const reorderLesson = useReorderLesson();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const [formData, setFormData] = useState<{
    subsectionId: string;
    title: string;
    type: CreateLessonRequestType;
    content: string;
    file: File | null;
  }>({ 
    subsectionId: "", 
    title: "", 
    type: CreateLessonRequestType.text,
    content: "",
    file: null
  });

  const { upload: uploadPdf, uploading: uploadingPdf } = usePdfUpload({
    onError: () => toast({ title: "Failed to upload PDF", variant: "destructive" }),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subsectionId) return;

    let uploadId: number | null = null;

    if (formData.type === "pdf" && formData.file) {
      const result = await uploadPdf(formData.file);
      if (!result) return;
      uploadId = result.uploadId;
    }

    createLesson.mutate(
      { 
        data: { 
          subsectionId: Number(formData.subsectionId), 
          title: formData.title, 
          type: formData.type,
          content: formData.type !== "pdf" ? formData.content : undefined,
          uploadId: uploadId
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey(Number(formData.subsectionId)) });
          if (selectedSubsectionId === "") setSelectedSubsectionId(Number(formData.subsectionId));
          setIsCreateOpen(false);
          setFormData({ subsectionId: "", title: "", type: CreateLessonRequestType.text, content: "", file: null });
          toast({ title: "Lesson created" });
        }
      }
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    
    let uploadId: number | undefined = undefined;

    if (formData.type === "pdf" && formData.file) {
      const result = await uploadPdf(formData.file);
      if (!result) return;
      uploadId = result.uploadId;
    }

    updateLesson.mutate(
      { 
        lessonId: editingLesson.id, 
        data: { 
          title: formData.title, 
          type: formData.type as any,
          content: formData.type !== "pdf" ? formData.content : undefined,
          uploadId: uploadId
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey(selectedSubsectionId as number) });
          setIsEditOpen(false);
          toast({ title: "Lesson updated" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      deleteLesson.mutate(
        { lessonId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey(selectedSubsectionId as number) });
            toast({ title: "Lesson deleted" });
          }
        }
      );
    }
  };

  const handleReorder = (id: number, direction: ReorderRequestDirection) => {
    reorderLesson.mutate(
      { lessonId: id, data: { direction } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey(selectedSubsectionId as number) });
        }
      }
    );
  };

  const openEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setFormData({
      subsectionId: lesson.subsectionId.toString(),
      title: lesson.title,
      type: lesson.type as CreateLessonRequestType,
      content: lesson.content || "",
      file: null
    });
    setIsEditOpen(true);
  };

  const renderContentInput = () => {
    switch (formData.type) {
      case "loom":
        return (
          <div className="space-y-2">
            <Label>Loom URL</Label>
            <Input 
              placeholder="https://www.loom.com/share/..." 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              required 
            />
          </div>
        );
      case "link":
        return (
          <div className="space-y-2">
            <Label>External Link URL</Label>
            <Input 
              placeholder="https://..." 
              type="url"
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              required 
            />
          </div>
        );
      case "pdf":
        return (
          <div className="space-y-2">
            <Label>Upload PDF</Label>
            <Input 
              type="file" 
              accept=".pdf"
              onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} 
              required={!isEditOpen || !editingLesson?.uploadUrl}
            />
            {isEditOpen && editingLesson?.uploadUrl && !formData.file && (
              <p className="text-sm text-muted-foreground mt-1">Current file is uploaded. Choose a new one to replace it.</p>
            )}
          </div>
        );
      case "text":
      default:
        return (
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Textarea 
              className="min-h-[200px]"
              placeholder="Write lesson content here..." 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              required 
            />
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            School Lessons
          </h1>
          <p className="text-muted-foreground mt-1">Manage individual learning materials.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={open => {
          setIsCreateOpen(open);
          if (open) setFormData({ 
            subsectionId: selectedSubsectionId ? String(selectedSubsectionId) : "", 
            title: "", 
            type: CreateLessonRequestType.text,
            content: "",
            file: null
          });
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Lesson</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Lesson</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Segment</Label>
                  <Select value={selectedSegmentId.toString()} onValueChange={v => {
                    setSelectedSegmentId(Number(v));
                    setFormData({...formData, subsectionId: ""});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                    <SelectContent>
                      {segments?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subsection</Label>
                  <Select 
                    disabled={!selectedSegmentId} 
                    value={formData.subsectionId} 
                    onValueChange={v => setFormData({...formData, subsectionId: v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select subsection" /></SelectTrigger>
                    <SelectContent>
                      {subsections?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>

              <div className="space-y-2">
                <Label>Lesson Type</Label>
                <Select value={formData.type} onValueChange={(v: CreateLessonRequestType) => setFormData({...formData, type: v, content: ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CreateLessonRequestType.text}><div className="flex items-center gap-2"><Type className="h-4 w-4"/> Text Content</div></SelectItem>
                    <SelectItem value={CreateLessonRequestType.loom}><div className="flex items-center gap-2"><Video className="h-4 w-4"/> Loom Video</div></SelectItem>
                    <SelectItem value={CreateLessonRequestType.pdf}><div className="flex items-center gap-2"><FileText className="h-4 w-4"/> PDF Upload</div></SelectItem>
                    <SelectItem value={CreateLessonRequestType.link}><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4"/> External Link</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderContentInput()}

              <DialogFooter>
                <Button type="submit" disabled={!formData.subsectionId || createLesson.isPending || uploadingPdf}>
                  {(createLesson.isPending || uploadingPdf) && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
        <div className="flex-1 space-y-1">
          <Label>Filter by Segment</Label>
          <Select value={selectedSegmentId.toString()} onValueChange={(v) => {
            setSelectedSegmentId(v ? Number(v) : "");
            setSelectedSubsectionId("");
          }}>
            <SelectTrigger>
              <SelectValue placeholder="All Segments" />
            </SelectTrigger>
            <SelectContent>
              {segments?.map(seg => (
                <SelectItem key={seg.id} value={seg.id.toString()}>{seg.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label>Filter by Subsection</Label>
          <Select 
            disabled={!selectedSegmentId}
            value={selectedSubsectionId.toString()} 
            onValueChange={(v) => setSelectedSubsectionId(v ? Number(v) : "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Subsections" />
            </SelectTrigger>
            <SelectContent>
              {subsections?.map(sub => (
                <SelectItem key={sub.id} value={sub.id.toString()}>{sub.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Lesson Type</Label>
              <Select value={formData.type} onValueChange={(v: CreateLessonRequestType) => setFormData({...formData, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={CreateLessonRequestType.text}><div className="flex items-center gap-2"><Type className="h-4 w-4"/> Text Content</div></SelectItem>
                  <SelectItem value={CreateLessonRequestType.loom}><div className="flex items-center gap-2"><Video className="h-4 w-4"/> Loom Video</div></SelectItem>
                  <SelectItem value={CreateLessonRequestType.pdf}><div className="flex items-center gap-2"><FileText className="h-4 w-4"/> PDF Upload</div></SelectItem>
                  <SelectItem value={CreateLessonRequestType.link}><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4"/> External Link</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderContentInput()}

            <DialogFooter>
              <Button type="submit" disabled={updateLesson.isPending || uploadingPdf}>
                {(updateLesson.isPending || uploadingPdf) && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden min-h-[200px]">
        {!selectedSubsectionId ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="h-12 w-12 opacity-20 mb-4" />
            <p>Select a segment and subsection to view lessons</p>
          </div>
        ) : lessonsLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !lessons?.length ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="h-12 w-12 opacity-20 mb-4" />
            <p>No lessons found for this subsection</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons?.map((lesson, index) => (
                <TableRow key={lesson.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || reorderLesson.isPending} onClick={() => handleReorder(lesson.id, ReorderRequestDirection.up)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === lessons.length - 1 || reorderLesson.isPending} onClick={() => handleReorder(lesson.id, ReorderRequestDirection.down)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-max font-normal uppercase text-[10px] tracking-wider">
                      {getLessonIcon(lesson.type)}
                      {lesson.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {lesson.title}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(lesson)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDelete(lesson.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
