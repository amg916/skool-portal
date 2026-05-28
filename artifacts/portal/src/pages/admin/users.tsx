import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  ShieldAlert,
  KeyRound,
  Ban,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  PowerOff,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/user-avatar";
import { format } from "date-fns";

type Identity = {
  provider: "email" | "google" | "facebook" | "github";
  providerEmail: string | null;
  lastSignInAt: string;
};

type AdminUserRow = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "member";
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  identities: Identity[];
  stats: { posts: number; comments: number };
};

async function adminListUsers(): Promise<AdminUserRow[]> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

async function adminCreateUser(body: { name: string; email: string; role: "admin" | "member" }) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ user: AdminUserRow; tempPassword: string }>;
}

async function adminResetPassword(userId: number) {
  const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ tempPassword: string }>;
}

async function adminDeactivate(userId: number) {
  const res = await fetch(`/api/admin/users/${userId}/deactivate`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function adminActivate(userId: number) {
  const res = await fetch(`/api/admin/users/${userId}/activate`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function adminSetRole(userId: number, role: "admin" | "member") {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PROVIDER_COLOR: Record<string, string> = {
  email: "bg-muted text-muted-foreground",
  google: "bg-blue-100 text-blue-700",
  facebook: "bg-[#1877F2] text-white",
  github: "bg-foreground text-background",
};

export default function AdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminListUsers,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "member">("member");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "admin" | "active" | "inactive" | "oauth">("all");
  const [query, setQuery] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const createMut = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: (res) => {
      setTempPassword(res.tempPassword);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("member");
      invalidate();
      toast({ title: "User created" });
    },
    onError: (e) => toast({ title: "Couldn't create", description: String(e), variant: "destructive" }),
  });
  const resetMut = useMutation({
    mutationFn: adminResetPassword,
    onSuccess: (res) => {
      setTempPassword(res.tempPassword);
      setIsCreateOpen(true);
      toast({ title: "Password reset" });
    },
  });
  const deactivateMut = useMutation({
    mutationFn: adminDeactivate,
    onSuccess: () => {
      invalidate();
      toast({ title: "User deactivated" });
    },
  });
  const activateMut = useMutation({
    mutationFn: adminActivate,
    onSuccess: () => {
      invalidate();
      toast({ title: "User reactivated" });
    },
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: number; role: "admin" | "member" }) => adminSetRole(v.userId, v.role),
    onSuccess: () => {
      invalidate();
      toast({ title: "Role updated" });
    },
    onError: (e) => toast({ title: "Couldn't change role", description: String(e), variant: "destructive" }),
  });

  const copyToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filtered = (users ?? [])
    .filter((u) => {
      if (filter === "admin") return u.role === "admin";
      if (filter === "active") return u.isActive;
      if (filter === "inactive") return !u.isActive;
      if (filter === "oauth") return u.identities.some((i) => i.provider !== "email");
      return true;
    })
    .filter((u) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Admin
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Users
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {users?.length ?? 0} total · {users?.filter((u) => u.role === "admin").length ?? 0} admins ·{" "}
            {users?.filter((u) => u.isActive).length ?? 0} active
          </p>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setTempPassword(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tempPassword ? "Temporary password" : "Create new user"}</DialogTitle>
              <DialogDescription>
                {tempPassword
                  ? "Copy this password — it won't be shown again."
                  : "Add a new member to Baingers."}
              </DialogDescription>
            </DialogHeader>
            {tempPassword ? (
              <div className="space-y-4">
                <Alert>
                  <KeyRound className="h-4 w-4" />
                  <AlertTitle>Temporary password</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="flex items-center justify-between bg-background p-2 rounded border font-mono">
                      <span>{tempPassword}</span>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <Button onClick={() => setIsCreateOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMut.mutate({ name: newUserName, email: newUserEmail, role: newUserRole });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as "admin" | "member")}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "admin", "active", "inactive", "oauth"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Sign-in methods</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={u.name}
                        avatarUrl={u.avatarUrl}
                        className="h-9 w-9"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.identities.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        u.identities.map((i) => (
                          <Badge
                            key={i.provider}
                            className={`text-[10px] uppercase tracking-wide ${PROVIDER_COLOR[i.provider] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {i.provider}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{u.stats.posts}</span> posts ·{" "}
                      <span className="font-medium text-foreground">{u.stats.comments}</span> comments
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {u.lastSignInAt ? format(new Date(u.lastSignInAt), "MMM d, h:mm a") : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => roleMut.mutate({ userId: u.id, role: v as "admin" | "member" })}
                    >
                      <SelectTrigger className="h-8 text-xs w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resetMut.mutate(u.id)}
                        disabled={resetMut.isPending}
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {u.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Deactivate ${u.name}?`)) deactivateMut.mutate(u.id);
                          }}
                          disabled={deactivateMut.isPending}
                          title="Deactivate"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-600 hover:text-emerald-700"
                          onClick={() => activateMut.mutate(u.id)}
                          disabled={activateMut.isPending}
                          title="Reactivate"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No users match the filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
