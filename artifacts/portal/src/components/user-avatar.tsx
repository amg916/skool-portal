import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className={cn("bg-muted text-foreground font-semibold", fallbackClassName)}>
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
