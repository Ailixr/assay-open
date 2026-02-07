import { NextRequest, NextResponse } from "next/server";
import { getInvoice, toPublicInvoice, markInvoiceViewed } from "@/lib/assay/invoice";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (invoice.status === "sent") markInvoiceViewed(id).catch(() => {});
    return NextResponse.json(toPublicInvoice(invoice));
  } catch (error) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
