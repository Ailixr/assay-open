import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { createInvoice, listInvoices } from "@/lib/assay/invoice";
import { createInvoiceSchema } from "@/lib/utils/validate";
import { errorResponse } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request, "invoices:write");
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const input = createInvoiceSchema.parse(body);
    const invoice = await createInvoice(auth.providerId, input);
    return NextResponse.json({
      id: invoice.id,
      status: invoice.status,
      base_cost: invoice.base_cost,
      currency: invoice.currency,
      invoice_url: `${process.env.ASSAY_BASE_URL}/invoice/${invoice.id}`,
      expires_at: invoice.expires_at,
    }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request, "invoices:read");
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = Number(searchParams.get("offset") || 0);
    const status = searchParams.get("status") || undefined;
    const { data, count } = await listInvoices(auth.providerId, { limit, offset, status });
    return NextResponse.json({ data, count, limit, offset });
  } catch (error) { return errorResponse(error); }
}
