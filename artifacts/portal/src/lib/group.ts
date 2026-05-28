import { useQuery } from "@tanstack/react-query";

export type Group = {
  id: number;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  iconUrl: string | null;
};

export async function fetchGroup(): Promise<Group> {
  const res = await fetch("/api/group", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load group settings");
  return res.json();
}

export function useGroup() {
  return useQuery({ queryKey: ["group"], queryFn: fetchGroup });
}

export type MemberCount = { total: number; admins: number };

export async function fetchMemberCount(): Promise<MemberCount> {
  const res = await fetch("/api/members", { credentials: "include" });
  if (!res.ok) return { total: 0, admins: 0 };
  const arr: Array<{ role: "admin" | "member" }> = await res.json();
  return {
    total: arr.length,
    admins: arr.filter((m) => m.role === "admin").length,
  };
}

export function useMemberCount() {
  return useQuery({ queryKey: ["members:count"], queryFn: fetchMemberCount });
}
