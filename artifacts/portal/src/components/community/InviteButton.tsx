import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy } from "lucide-react";

const INVITE_URL = "https://baingers.com";

export function InviteButton({
  className,
  label = "Invite a builder",
}: {
  className?: string;
  label?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_URL);
      setCopied(true);
      toast({
        title: "Invite link copied to clipboard",
        description: `${INVITE_URL} — paste it in a DM, Slack, anywhere`,
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Older browsers — fall back to a hidden textarea trick
      try {
        const ta = document.createElement("textarea");
        ta.value = INVITE_URL;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        toast({
          title: "Invite link copied",
          description: INVITE_URL,
        });
        setTimeout(() => setCopied(false), 2200);
      } catch {
        toast({
          title: "Copy failed",
          description: `Share this link manually: ${INVITE_URL}`,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={
        className ??
        "w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
      }
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" /> Link copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" /> {label}
        </>
      )}
    </Button>
  );
}
