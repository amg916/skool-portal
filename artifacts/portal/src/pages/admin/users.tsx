import { useState } from "react";
import { Link } from "wouter";
import { useListUsers, useCreateUser, useResetUserPassword, useDeactivateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus, ShieldAlert, KeyRound, Ban, Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreateUserRequestRole } from "@workspace/api-client-react";

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createUser = useCreateUser();
  const resetPassword = useResetUserPassword();
  const deactivateUser = useDeactivateUser();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<CreateUserRequestRole>(CreateUserRequestRole.member);
  
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(
      { data: { name: newUserName, email: newUserEmail, role: newUserRole } },
      {
        onSuccess: (res) => {
          setTempPassword(res.tempPassword);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setNewUserName("");
          setNewUserEmail("");
          setNewUserRole(CreateUserRequestRole.member);
          toast({ title: "User created successfully" });
        },
        onError: () => {
          toast({ title: "Failed to create user", variant: "destructive" });
        }
      }
    );
  };

  const handleResetPassword = (userId: number) => {
    resetPassword.mutate(
      { userId },
      {
        onSuccess: (res) => {
          setTempPassword(res.tempPassword);
          setIsCreateOpen(true); // Open modal to show password
          toast({ title: "Password reset successfully" });
        }
      }
    );
  };

  const handleDeactivate = (userId: number) => {
    if (confirm("Are you sure you want to deactivate this user?")) {
      deactivateUser.mutate(
        { userId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            toast({ title: "User deactivated" });
          }
        }
      );
    }
  };

  const copyToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Users
          </h1>
          <p className="text-muted-foreground mt-1">Manage portal members and administrators.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={open => {
          setIsCreateOpen(open);
          if (!open) setTempPassword(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tempPassword ? "User Password" : "Create New User"}</DialogTitle>
              <DialogDescription>
                {tempPassword 
                  ? "Please copy this temporary password. It will not be shown again." 
                  : "Add a new member to the portal."}
              </DialogDescription>
            </DialogHeader>

            {tempPassword ? (
              <div className="space-y-4">
                <Alert className="bg-primary/10 border-primary/20">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <AlertTitle>Temporary Password</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="flex items-center justify-between bg-background p-2 rounded border font-mono">
                      <span>{tempPassword}</span>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <Button onClick={() => setIsCreateOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(v: CreateUserRequestRole) => setNewUserRole(v)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CreateUserRequestRole.member}>Member</SelectItem>
                      <SelectItem value={CreateUserRequestRole.admin}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-none"><ShieldAlert className="h-3 w-3 mr-1" /> Admin</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">Member</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <span className="flex items-center text-sm text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="flex items-center text-sm text-muted-foreground">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleResetPassword(user.id)}
                        disabled={resetPassword.isPending}
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeactivate(user.id)}
                        disabled={!user.isActive || deactivateUser.isPending}
                        title="Deactivate"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
