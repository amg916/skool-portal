import { UserAvatar } from "@/components/user-avatar";

type Commenter = { id: number; name: string; avatarUrl: string | null };

export function RecentCommenters({ commenters }: { commenters: Commenter[] }) {
  if (!commenters.length) return null;
  return (
    <div className="flex -space-x-2">
      {commenters.slice(0, 3).map((c) => (
        <UserAvatar
          key={c.id}
          name={c.name}
          avatarUrl={c.avatarUrl}
          className="h-6 w-6 ring-2 ring-card"
          fallbackClassName="text-[9px]"
        />
      ))}
    </div>
  );
}
