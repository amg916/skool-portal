import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGroup, type Group } from "@/lib/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

async function patchGroup(body: Partial<Group>): Promise<Group> {
  const res = await fetch("/api/group", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminGroupPage() {
  const { data: group, isLoading } = useGroup();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setSlug(group.slug);
    setDescription(group.description);
    setBannerUrl(group.bannerUrl ?? "");
    setIconUrl(group.iconUrl ?? "");
  }, [group]);

  const mutation = useMutation({
    mutationFn: patchGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group"] });
      toast({ title: "Group settings saved" });
    },
    onError: (e) =>
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  if (isLoading || !group) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-bold text-foreground mb-1">Group settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Changes propagate immediately across the portal.
      </p>

      <form
        className="space-y-5 bg-card border border-border rounded-xl p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            name,
            slug,
            description,
            bannerUrl: bannerUrl.trim() || null,
            iconUrl: iconUrl.trim() || null,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="g-name">Name</Label>
          <Input
            id="g-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-slug">URL / slug</Label>
          <Input
            id="g-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="skool.amgcc.space"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-description">Description</Label>
          <Textarea
            id="g-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-banner">Banner URL</Label>
          <Input
            id="g-banner"
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://… (optional)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-icon">Icon URL</Label>
          <Input
            id="g-icon"
            type="url"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://… (optional)"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
