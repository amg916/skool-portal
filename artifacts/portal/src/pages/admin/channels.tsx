import { useState } from "react";
import { Link } from "wouter";
import { 
  useListChannels, 
  useCreateChannel, 
  useUpdateChannel, 
  useDeleteChannel,
  useReorderChannel,
  getListChannelsQueryKey,
  ReorderRequestDirection
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Hash, Plus, ArrowLeft, Loader2, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function AdminChannels() {
  const { data: channels, isLoading } = useListChannels();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const reorderChannel = useReorderChannel();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);

  const [formData, setFormData] = useState({ name: "", description: "", adminsOnly: false });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createChannel.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
          setIsCreateOpen(false);
          setFormData({ name: "", description: "", adminsOnly: false });
          toast({ title: "Channel created" });
        }
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    
    updateChannel.mutate(
      { channelId: editingChannel.id, data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
          setIsEditOpen(false);
          toast({ title: "Channel updated" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      deleteChannel.mutate(
        { channelId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
            toast({ title: "Channel deleted" });
          }
        }
      );
    }
  };

  const handleReorder = (id: number, direction: ReorderRequestDirection) => {
    reorderChannel.mutate(
      { channelId: id, data: { direction } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
        }
      }
    );
  };

  const openEdit = (channel: any) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.description || "",
      adminsOnly: channel.adminsOnly
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
            <Hash className="h-8 w-8 text-primary" />
            Channels
          </h1>
          <p className="text-muted-foreground mt-1">Manage community discussion channels.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={open => {
          setIsCreateOpen(open);
          if (open) setFormData({ name: "", description: "", adminsOnly: false });
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Channel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Channel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Admins Only</Label>
                <Switch checked={formData.adminsOnly} onCheckedChange={c => setFormData({...formData, adminsOnly: c})} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createChannel.isPending}>
                  {createChannel.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Admins Only</Label>
              <Switch checked={formData.adminsOnly} onCheckedChange={c => setFormData({...formData, adminsOnly: c})} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateChannel.isPending}>
                {updateChannel.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
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
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels?.map((channel, index) => (
                <TableRow key={channel.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || reorderChannel.isPending} onClick={() => handleReorder(channel.id, ReorderRequestDirection.up)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === channels.length - 1 || reorderChannel.isPending} onClick={() => handleReorder(channel.id, ReorderRequestDirection.down)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      {channel.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {channel.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {channel.isDefault && <Badge variant="default" className="bg-blue-500">Default</Badge>}
                      {channel.adminsOnly && <Badge variant="secondary">Admins Only</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(channel)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                        disabled={channel.isDefault}
                        onClick={() => handleDelete(channel.id)}
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
