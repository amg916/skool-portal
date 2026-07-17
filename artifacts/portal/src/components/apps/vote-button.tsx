import { ChevronUp, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVoteApp, useUnvoteApp } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VoteButton({
  appId,
  voteCount,
  votedByMe,
}: {
  appId: number;
  voteCount: number;
  votedByMe: boolean;
}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries();
  const vote = useVoteApp({ mutation: { onSuccess: invalidate } });
  const unvote = useUnvoteApp({ mutation: { onSuccess: invalidate } });
  const busy = vote.isPending || unvote.isPending;

  return (
    <Button
      type="button"
      variant={votedByMe ? "default" : "outline"}
      size="sm"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (votedByMe) unvote.mutate({ id: appId });
        else vote.mutate({ id: appId });
      }}
      className={cn("h-auto flex-col gap-0.5 px-3 py-1.5", votedByMe && "ring-1 ring-primary")}
      aria-pressed={votedByMe}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronUp className="h-4 w-4" />}
      <span className="text-xs font-semibold tabular-nums">{voteCount}</span>
    </Button>
  );
}
