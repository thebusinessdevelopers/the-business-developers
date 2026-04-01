import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const setupSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(2),
  email: z.string().email(),
  org_name: z.string().min(2),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = setupSchema.parse(body);

    const supabase = await createServiceClient();
    const slug = data.org_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Create organisation
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .insert({ name: data.org_name, slug })
      .select("id")
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 400 });
    }

    // Create user record linked to auth user
    const { error: userError } = await supabase.from("users").insert({
      id: data.user_id,
      org_id: org.id,
      email: data.email,
      full_name: data.full_name,
      role: "owner",
      password_display: data.password,
    });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    return NextResponse.json({ org_id: org.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
