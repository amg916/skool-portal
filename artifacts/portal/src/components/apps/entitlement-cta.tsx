import { CheckCircle2, ExternalLink, Loader2, PauseCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStartEntitlement } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Entitlement = { status: string; externalId?: string | null } | null;

/**
 * CTA for `provisioned` apps (GHL SaaS Mode).
 *
 * The account is free — you only pay for usage credits (SMS/email/AI), and the
 * card is entered on GHL's own surface, into GHL's Stripe. We never render a
 * card field: that would put this server in PCI scope. We just record intent and
 * hand off; GHL's webhook tells us the outcome.
 */
export function EntitlementCta({
  appId,
  appName,
  signupUrl,
  entitlement,
}: {
  appId: number;
  appName: string;
  signupUrl: string | null;
  entitlement: Entitlement;
}) {
  const qc = useQueryClient();
  const start = useStartEntitlement({ mutation: { onSuccess: () => qc.invalidateQueries() } });
  const status = entitlement?.status;

  if (status === "active") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-medium">Your {appName} account is active</span>
        {signupUrl && (
          <Button asChild size="sm" variant="outline" className="ml-auto gap-1">
            <a href={signupUrl} target="_blank" rel="noopener noreferrer">
              Open it <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <PauseCircle className="h-5 w-5 text-amber-600" />
        <div className="text-sm">
          <p className="font-medium">Account paused</p>
          <p className="text-muted-foreground">Update your card with {appName} to resume.</p>
        </div>
        {signupUrl && (
          <Button asChild size="sm" variant="outline" className="ml-auto gap-1">
            <a href={signupUrl} target="_blank" rel="noopener noreferrer">
              Fix billing <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">Get a free {appName} account</p>
        <p className="text-sm text-muted-foreground">
          $0/month. You only pay for the credits you use (SMS, email, AI) — billed by {appName}, not us.
          Your card is entered on their site; we never see it.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {signupUrl ? (
          <Button
            asChild
            className="gap-2"
            onClick={() => start.mutate({ id: appId })}
          >
            <a href={signupUrl} target="_blank" rel="noopener noreferrer">
              Create my free account
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button disabled>Signup link coming soon</Button>
        )}
        {status === "pending" && (
          <Badge variant="outline" className="gap-1 text-amber-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Waiting for confirmation
          </Badge>
        )}
      </div>
    </div>
  );
}
