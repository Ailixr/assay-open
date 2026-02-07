import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { data } = await supabase.from("invoices").select("id, status, paid_at, rating").eq("id", params.id).single();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ id: data.id, status: data.status, paid: !!data.paid_at, rated: !!data.rating });
}
