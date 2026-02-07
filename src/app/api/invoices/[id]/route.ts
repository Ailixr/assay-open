import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { getInvoice } from "@/lib/assay/invoice";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request, "invoices:read");
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (invoice.provider_id !== auth.providerId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
