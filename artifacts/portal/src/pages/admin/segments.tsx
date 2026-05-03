import { useState } from "react";
import { Link } from "wouter";
import { 
  useListSegments, 
  useCreateSegment, 
  useUpdateSegment, 
  useDeleteSegment,
  useReorderSegment,
  getListSegmentsQueryKey,
  ReorderRequestDirection
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, ArrowLeft, Loader2, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function AdminSegments() {
  const { data: segments, isLoading } = useListSegments();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const deleteSegment = useDeleteSegment();
  const reorderSegment = useReorderSegment();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);

  const [formData, setFormData] = useState({ title: "", description: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSegment.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSegmentsQueryKey() });
          setIsCreateOpen(false);
          setFormData({ title: "", description: "" });
          toast({ title: "Segment created" });
        }
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSegment) return;
    
    updateSegment.mutate(
      { segmentId: editingSegment.id, data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSegmentsQueryKey() });
          setIsEditOpen(false);
          toast({ title: "Segment updated" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this segment? This will delete all related subsections and lessons.")) {
      deleteSegment.mutate(
        { segmentId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSegmentsQueryKey() });
            toast({ title: "Segment deleted" });
          }
        }
      );
    }
  };

  const handleReorder = (id: number, direction: ReorderRequestDirection) => {
    reorderSegment.mutate(
      { segmentId: id, data: { direction } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSegmentsQueryKey() });
        }
      }
    );
  };

  const openEdit = (segment: any) => {
    setEditingSegment(segment);
    setFormData({
      title: segment.title,
      description: segment.description || ""
    });
    setIsEditOpen(true);
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

      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            School Segments
          </h1>
          <p className="text-muted-foreground mt-1">Manage top-level curriculum categories.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={open => {
          setIsCreateOpen(open);
          if (open) setFormData({ title: "", description: "" });
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Segment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Segment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSegment.isPending}>
                  {createSegment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateSegment.isPending}>
                {updateSegment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments?.map((segment, index) => (
                <TableRow key={segment.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || reorderSegment.isPending} onClick={() => handleReorder(segment.id, ReorderRequestDirection.up)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === segments.length - 1 || reorderSegment.isPending} onClick={() => handleReorder(segment.id, ReorderRequestDirection.down)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {segment.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                    {segment.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(segment)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDelete(segment.id)}
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
