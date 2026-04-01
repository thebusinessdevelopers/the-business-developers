import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const resetSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = resetSchema.parse(body);

    const supabase = await createServiceClient();

    // Update auth password
    const { error: authError } = await supabase.auth.admin.updateUserById(
      data.user_id,
      { password: data.password }
    );

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update password_display
    const { error: profileError } = await supabase
      .from("users")
      .update({ password_display: data.password })
      .eq("id", data.user_id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
