// TODO: Implement per CURSOR-08-KHQR.md
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: "create-qr endpoint — implement per CURSOR-08" });
}
