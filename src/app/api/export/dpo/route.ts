import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { generateDPOExport } from "@/lib/assay/dpo-export";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request, "invoices:read");
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const model = searchParams.get("model") ?? undefined;
    const since = searchParams.get("since") ?? undefined;
    const until = searchParams.get("until") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const format = searchParams.get("format") ?? "json"; // json or jsonl
    const result = await generateDPOExport(auth.providerId, { model, since, until, limit });
    if (format === "jsonl") {
      const lines = result.pairs.map((p) => JSON.stringify(p)).join("\n");
      return new NextResponse(lines + (lines ? "\n" : ""), {
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
