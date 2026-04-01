"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { userSchema, type UserInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserCog } from "lucide-react";
import type { UserRole } from "@/types/forms";

interface Department {
  id: string;
  name: string;
}

interface UserWithDepartment {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  phone: string | null;
  active: boolean | null;
  department_id: string | null;
  departments: { id: string; name: string } | null;
}

interface Props {
  users: UserWithDepartment[];
  departments: Department[];
  orgId: string;
  currentUserRole: string;
}

export function UsersManager({ users, departments, orgId, currentUserRole }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithDepartment | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users</p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Add user
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <AddUserForm
              orgId={orgId}
              departments={departments}
              onSuccess={() => { setAddOpen(false); router.refresh(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{user.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                    {user.role}
                  </Badge>
                  {user.departments && (
                    <span className="truncate">{user.departments.name}</span>
                  )}
                  {!user.active && (
                    <Badge variant="outline" className="text-xs text-destructive">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              <Dialog open={editUser?.id === user.id} onOpenChange={(open) => setEditUser(open ? user : null)}>
                <DialogTrigger render={<Button variant="ghost" size="icon" />}>
                  <UserCog className="h-4 w-4" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                  </DialogHeader>
                  <EditUserForm
                    user={user}
                    departments={departments}
                    currentUserRole={currentUserRole}
                    onSuccess={() => { setEditUser(null); router.refresh(); }}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddUserForm({
  orgId,
  departments,
  onSuccess,
}: {
  orgId: string;
  departments: Department[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "staff" },
  });

  async function onSubmit(data: UserInput) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, org_id: orgId }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Full name</Label>
        <Input {...register("full_name")} />
        {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="text" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select defaultValue="staff" onValueChange={(v) => setValue("role", v as UserRole)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="hod">HOD</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Department</Label>
        <Select onValueChange={(v: string | null) => setValue("department_id", !v || v === "none" ? null : v)}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input {...register("phone")} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create user"}
      </Button>
    </form>
  );
}

function EditUserForm({
  user,
  departments,
  currentUserRole,
  onSuccess,
}: {
  user: UserWithDepartment;
  departments: Department[];
  currentUserRole: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  async function handleUpdate(field: string, value: string | boolean | null) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ [field]: value } as Record<string, string | boolean | null>)
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  }

  async function handlePasswordReset() {
    if (!resetPassword || resetPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, password: resetPassword }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error);
    } else {
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{user.full_name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select defaultValue={user.role} onValueChange={(v) => handleUpdate("role", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="hod">HOD</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <Select
          defaultValue={user.department_id ?? "none"}
          onValueChange={(v) => handleUpdate("department_id", v === "none" ? null : v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Reset password</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="New password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
          <Button variant="outline" onClick={handlePasswordReset} disabled={loading}>
            Reset
          </Button>
        </div>
      </div>

      <div className="pt-2 border-t">
        <Button
          variant={user.active ? "destructive" : "default"}
          size="sm"
          onClick={() => handleUpdate("active", !user.active)}
          disabled={loading}
        >
          {user.active ? "Deactivate user" : "Reactivate user"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
