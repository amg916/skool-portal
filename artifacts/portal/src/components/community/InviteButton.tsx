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

  const copyViaTextarea = (): boolean => {
    try {
      const ta = document.createElement("textarea");
      ta.value = INVITE_URL;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleClick = () => {
    // 1) Fire UI feedback synchronously so the user ALWAYS sees something.
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    toast({
      title: "Invite link copied",
      description: `${INVITE_URL} — paste it in a DM, Slack, or text`,
    });

    // 2) Try the modern async clipboard API (best UX) without blocking the UI.
    let didModern = false;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(INVITE_URL)
        .then(() => {
          didModern = true;
        })
        .catch(() => {
          // Fall through — execCommand attempt below already covers this.
        });
    }

    // 3) Always attempt the execCommand fallback as well so something lands on
    //    the clipboard even if the async API silently rejects in a non-HTTPS
    //    or permission-denied context. Modern API may overwrite this later,
    //    which is fine.
    if (!didModern) copyViaTextarea();
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
