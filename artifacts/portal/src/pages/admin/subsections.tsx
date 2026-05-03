import { useState } from "react";
import { Link } from "wouter";
import { 
  useListSegments, 
  useListSubsections,
  useCreateSubsection, 
  useUpdateSubsection, 
  useDeleteSubsection,
  useReorderSubsection,
  getListSubsectionsQueryKey,
  ReorderRequestDirection
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, ArrowLeft, Loader2, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubsections() {
  const { data: segments, isLoading: segmentsLoading } = useListSegments();
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | "">("");

  const { data: subsections, isLoading: subsectionsLoading } = useListSubsections(
    selectedSegmentId as number, 
    { query: { enabled: !!selectedSegmentId } }
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createSubsection = useCreateSubsection();
  const updateSubsection = useUpdateSubsection();
  const deleteSubsection = useDeleteSubsection();
  const reorderSubsection = useReorderSubsection();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSubsection, setEditingSubsection] = useState<any>(null);

  const [formData, setFormData] = useState({ segmentId: "", title: "", description: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.segmentId) return;

    createSubsection.mutate(
      { data: { segmentId: Number(formData.segmentId), title: formData.title, description: formData.description } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubsectionsQueryKey(Number(formData.segmentId)) });
          if (selectedSegmentId === "") setSelectedSegmentId(Number(formData.segmentId));
          setIsCreateOpen(false);
          setFormData({ segmentId: "", title: "", description: "" });
          toast({ title: "Subsection created" });
        }
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubsection) return;
    
    updateSubsection.mutate(
      { subsectionId: editingSubsection.id, data: { title: formData.title, description: formData.description } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubsectionsQueryKey(selectedSegmentId as number) });
          setIsEditOpen(false);
          toast({ title: "Subsection updated" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this subsection? This will delete all related lessons.")) {
      deleteSubsection.mutate(
        { subsectionId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSubsectionsQueryKey(selectedSegmentId as number) });
            toast({ title: "Subsection deleted" });
          }
        }
      );
    }
  };

  const handleReorder = (id: number, direction: ReorderRequestDirection) => {
    reorderSubsection.mutate(
      { subsectionId: id, data: { direction } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubsectionsQueryKey(selectedSegmentId as number) });
        }
      }
    );
  };

  const openEdit = (subsection: any) => {
    setEditingSubsection(subsection);
    setFormData({
      segmentId: subsection.segmentId.toString(),
      title: subsection.title,
      description: subsection.description || ""
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            School Subsections
          </h1>
          <p className="text-muted-foreground mt-1">Manage groupings of lessons within segments.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={open => {
          setIsCreateOpen(open);
          if (open) setFormData({ segmentId: selectedSegmentId ? String(selectedSegmentId) : "", title: "", description: "" });
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Subsection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subsection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Segment</Label>
                <Select value={formData.segmentId} onValueChange={(v) => setFormData({...formData, segmentId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments?.map(seg => (
                      <SelectItem key={seg.id} value={seg.id.toString()}>{seg.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!formData.segmentId || createSubsection.isPending}>
                  {createSubsection.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Label className="whitespace-nowrap">Filter by Segment:</Label>
        <Select value={selectedSegmentId.toString()} onValueChange={(v) => setSelectedSegmentId(v ? Number(v) : "")}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="All Segments (Please select one)" />
          </SelectTrigger>
          <SelectContent>
            {segments?.map(seg => (
              <SelectItem key={seg.id} value={seg.id.toString()}>{seg.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subsection</DialogTitle>
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
              <Button type="submit" disabled={updateSubsection.isPending}>
                {updateSubsection.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden min-h-[200px]">
        {segmentsLoading || (selectedSegmentId && subsectionsLoading) ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !selectedSegmentId ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Layers className="h-12 w-12 opacity-20 mb-4" />
            <p>Select a segment to view its subsections</p>
          </div>
        ) : !subsections?.length ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Layers className="h-12 w-12 opacity-20 mb-4" />
            <p>No subsections found for this segment</p>
          </div>
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
              {subsections?.map((subsection, index) => (
                <TableRow key={subsection.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || reorderSubsection.isPending} onClick={() => handleReorder(subsection.id, ReorderRequestDirection.up)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === subsections.length - 1 || reorderSubsection.isPending} onClick={() => handleReorder(subsection.id, ReorderRequestDirection.down)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {subsection.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                    {subsection.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(subsection)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDelete(subsection.id)}
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
