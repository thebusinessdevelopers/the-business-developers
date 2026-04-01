import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, type UserRole } from "@/types/forms";
import { StockItemForm } from "@/components/stock/stock-item-form";
import { StockItemDetail } from "@/components/stock/stock-item-detail";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function StockItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  const { data: item } = await supabase
    .from("stock_items")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) notFound();

  if (edit && isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Edit {item.name}</h1>
        <StockItemForm orgId={profile.org_id} existing={item} />
      </div>
    );
  }

  const { data: recentTxns } = await supabase
    .from("stock_transactions")
    .select("*, users:performed_by(full_name), departments:department_id(name)")
    .eq("item_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <StockItemDetail
      item={item}
      transactions={recentTxns ?? []}
      isAdmin={isAdmin}
    />
  );
}
