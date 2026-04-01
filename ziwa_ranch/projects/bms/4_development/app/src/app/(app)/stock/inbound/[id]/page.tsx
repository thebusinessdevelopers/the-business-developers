import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PurchaseOrderDetail } from "@/components/stock/purchase-order-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderPage({ params }: Props) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("*, users:received_by(full_name)")
    .eq("id", id)
    .single();

  if (!po) notFound();

  return <PurchaseOrderDetail order={po} />;
}
