import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubmitApp, useListAppCategories } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function SubmitAppDialog() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categories } = useListAppCategories();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const submit = useSubmitApp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries();
        toast({ title: "Submitted", description: "Your app is in the Incubator, pending review." });
        setOpen(false);
        setName("");
        setTagline("");
        setDescription("");
        setExternalUrl("");
        setCategoryId("");
      },
      onError: () => toast({ title: "Couldn't submit", description: "Check the fields and try again.", variant: "destructive" }),
    },
  });

  const canSubmit = name.trim() && externalUrl.trim() && categoryId !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Submit your app
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit an app</DialogTitle>
          <DialogDescription>
            It enters the Incubator for community voting. An admin reviews it before it goes public.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="app-name">Name</Label>
            <Input id="app-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AI tool" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-url">Link</Label>
            <Input id="app-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-cat">Category</Label>
            <select
              id="app-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Choose a category…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-tagline">Tagline</Label>
            <Input id="app-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line about it" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-desc">Description</Label>
            <Textarea id="app-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!canSubmit || submit.isPending}
            onClick={() =>
              submit.mutate({
                data: {
                  name: name.trim(),
                  tagline: tagline.trim() || undefined,
                  description: description.trim() || undefined,
                  categoryId: Number(categoryId),
                  externalUrl: externalUrl.trim(),
                },
              })
            }
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
