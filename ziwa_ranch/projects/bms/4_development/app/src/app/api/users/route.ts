import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const createUserSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "hod", "staff"]),
  department_id: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  org_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);

    const supabase = await createServiceClient();

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create profile row
    const { error: profileError } = await supabase.from("users").insert({
      id: authUser.user.id,
      org_id: data.org_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      department_id: data.department_id ?? null,
      phone: data.phone || null,
      password_display: data.password,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ id: authUser.user.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
