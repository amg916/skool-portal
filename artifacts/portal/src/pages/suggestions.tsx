import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock4,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Suggestion = {
  id: number;
  title: string;
  body: string;
  status: "open" | "planned" | "done" | "rejected";
  authorId: number;
  authorName: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  voteCount: number;
  votedByMe: boolean;
};

async function fetchSuggestions(sort: "top" | "new"): Promise<Suggestion[]> {
  const r = await fetch(`/api/suggestions?sort=${sort}`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load suggestions");
  return r.json();
}

async function createSuggestion(body: { title: string; body: string }) {
  const r = await fetch("/api/suggestions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function toggleVote(id: number) {
  const r = await fetch(`/api/suggestions/${id}/vote/toggle`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function setStatus(id: number, status: string) {
  const r = await fetch(`/api/admin/suggestions/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function deleteSuggestion(id: number) {
  const r = await fetch(`/api/suggestions/${id}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
}

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  open: { label: "Open", cls: "bg-blue-100 text-blue-700", icon: <Clock4 className="h-3 w-3" /> },
  planned: { label: "Planned", cls: "bg-amber-100 text-amber-700", icon: <Clock4 className="h-3 w-3" /> },
  done: { label: "Done", cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Closed", cls: "bg-zinc-200 text-zinc-700", icon: <XCircle className="h-3 w-3" /> },
};

export default function SuggestionsPage() {
  const { data: user } = useGetMe();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"top" | "new">("top");
  const { data, isLoading } = useQuery({
    queryKey: ["suggestions", tab],
    queryFn: () => fetchSuggestions(tab),
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createMut = useMutation({
    mutationFn: createSuggestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      setTitle("");
      setBody("");
      setOpen(false);
      toast({ title: "Idea posted." });
    },
    onError: (e) =>
      toast({
        title: "Couldn't post",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  const voteMut = useMutation({
    mutationFn: toggleVote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suggestions"] }),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: number; status: string }) => setStatus(v.id, v.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suggestions"] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSuggestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast({ title: "Suggestion removed." });
    },
  });

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-accent" /> Suggestion board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            What should the community see next? Drop an idea, vote on others.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4 mr-1.5" /> New idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a new idea</DialogTitle>
              <DialogDescription>
                A project you'd want to see made, a tool that should exist, or a banger topic.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim() || !body.trim()) return;
                createMut.mutate({ title: title.trim(), body: body.trim() });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Real-time meeting note-taker with Sonnet"
                  maxLength={140}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">What does it do? Why does it matter?</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Post
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(["top", "new"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              tab === t
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "top" ? "Top voted" : "Newest"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No ideas yet</p>
          <p className="text-sm mt-1">Be the first to post one.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data!.map((s) => {
            const statusInfo = STATUS_STYLES[s.status] ?? STATUS_STYLES.open;
            return (
              <li
                key={s.id}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm flex items-start gap-4"
              >
                <button
                  type="button"
                  onClick={() => voteMut.mutate(s.id)}
                  className={`flex flex-col items-center justify-center min-w-[60px] rounded-lg border px-2 py-2 transition-colors ${
                    s.votedByMe
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/40 text-foreground border-border hover:border-foreground/30"
                  }`}
                  aria-label={s.votedByMe ? "Remove vote" : "Vote"}
                  aria-pressed={s.votedByMe}
                >
                  <ChevronUp className="h-5 w-5" />
                  <span className="text-sm font-bold">{s.voteCount}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-base leading-snug">{s.title}</h3>
                    <Badge className={`text-[10px] uppercase tracking-wider ${statusInfo!.cls}`}>
                      <span className="flex items-center gap-1">
                        {statusInfo!.icon}
                        {statusInfo!.label}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap">{s.body}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <UserAvatar
                      name={s.authorName ?? "?"}
                      avatarUrl={s.authorAvatarUrl}
                      className="h-5 w-5"
                      fallbackClassName="text-[9px]"
                    />
                    <span>{s.authorName ?? "Unknown"}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <Select
                      value={s.status}
                      onValueChange={(v) => statusMut.mutate({ id: s.id, status: v })}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="rejected">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {(isAdmin || s.authorId === user?.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remove this suggestion?")) deleteMut.mutate(s.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove suggestion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
