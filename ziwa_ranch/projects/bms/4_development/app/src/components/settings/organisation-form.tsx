"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { organisationSchema, type OrganisationInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database";

type OrgRow = Database["public"]["Tables"]["organisations"]["Row"];

export function OrganisationForm({ org }: { org: OrgRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<OrganisationInput>({
    resolver: zodResolver(organisationSchema),
    defaultValues: {
      name: org.name,
      type: (org.type as OrganisationInput["type"]) ?? "lodge",
      location: org.location ?? "",
      room_count: org.room_count ?? undefined,
    },
  });

  async function onSubmit(data: OrganisationInput) {
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("organisations")
      .update({
        name: data.name,
        type: data.type,
        location: data.location || null,
        room_count: data.room_count ?? null,
      })
      .eq("id", org.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Saved");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Property type</Label>
            <Select
              defaultValue={org.type ?? "lodge"}
              onValueChange={(v) => form.setValue("type", v as OrganisationInput["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lodge">Lodge</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="resort">Resort</SelectItem>
                <SelectItem value="camp">Camp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...form.register("location")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_count">Room count</Label>
            <Input
              id="room_count"
              type="number"
              min={0}
              {...form.register("room_count", { valueAsNumber: true })}
            />
          </div>

          {message && (
            <p className={`text-sm ${message === "Saved" ? "text-green-600" : "text-destructive"}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
