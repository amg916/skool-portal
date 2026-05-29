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
    const shareData = {
      title: "Baingers",
      text: "AI bangers, under 10 minutes. Members-only community for people actually making things with AI.",
      url: INVITE_URL,
    };

    try {
      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        navigator.canShare?.(shareData)
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* fall through to clipboard */
    }

    try {
      await navigator.clipboard.writeText(INVITE_URL);
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
