import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRateApp, useUnrateApp, type AppReview } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Stars, StarPicker } from "@/components/apps/star-rating";
import { useToast } from "@/hooks/use-toast";

export function RatingPanel({
  appId,
  avgRating,
  ratingCount,
  myRating,
  reviews,
}: {
  appId: number;
  avgRating: number | null;
  ratingCount: number;
  myRating: number | null;
  reviews: AppReview[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const rate = useRateApp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries();
        setReview("");
        setPending(null);
        toast({ title: "Thanks — rating saved" });
      },
    },
  });
  const unrate = useUnrateApp({ mutation: { onSuccess: () => qc.invalidateQueries() } });
  const busy = rate.isPending || unrate.isPending;
  const selected = pending ?? myRating;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ratings</h2>
        {ratingCount > 0 ? (
          <span className="flex items-center gap-2">
            <Stars value={avgRating ?? 0} />
            <span className="text-sm font-medium">{avgRating}</span>
            <span className="text-sm text-muted-foreground">
              ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No ratings yet — be the first.</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <StarPicker value={selected} onChange={setPending} disabled={busy} />
          {myRating != null && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              disabled={busy}
              onClick={() => unrate.mutate({ id: appId })}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        {pending != null && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add a review (optional)"
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => rate.mutate({ id: appId, data: { rating: pending, review: review.trim() || undefined } })}
            >
              {rate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {myRating != null ? "Update rating" : "Submit rating"}
            </Button>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <ul className="space-y-3 border-t pt-3">
          {reviews.map((r) => (
            <li key={r.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.userName}</span>
                <Stars value={r.rating} />
              </div>
              {r.review && <p className="text-sm text-muted-foreground">{r.review}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
