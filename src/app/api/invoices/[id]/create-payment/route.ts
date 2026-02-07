import { NextRequest, NextResponse } from "next/server";
import { createPaymentLinkForInvoice } from "@/lib/assay/invoice";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentLink = await createPaymentLinkForInvoice(id);
    return NextResponse.json({ payment_link: paymentLink });
  } catch (error) {
    if (error instanceof Error && error.message === "not_found")
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error instanceof Error && error.message === "already_paid")
      return NextResponse.json({ error: "already_paid" }, { status: 400 });
    if (error instanceof Error && error.message === "invalid_amount")
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
