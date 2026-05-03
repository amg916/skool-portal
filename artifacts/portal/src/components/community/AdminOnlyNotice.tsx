import { ShieldAlert } from "lucide-react";

export function AdminOnlyNotice() {
  return (
    <div className="flex items-start gap-3 mx-auto max-w-3xl mt-4 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
      <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-sm leading-snug">
        This channel is restricted to admins. You can read posts but cannot reply.
      </p>
    </div>
  );
}
