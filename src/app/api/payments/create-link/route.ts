// TODO: Implement per CURSOR-03-PAYWAY-CLIENT.md
// This route is for creating standalone payment links outside the invoice flow
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: "create-link endpoint — implement per CURSOR-03" });
}
