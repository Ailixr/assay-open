import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "validation_error", details: error.errors }, { status: 400 });
  }
  if (error instanceof Error) {
    console.error("[Assay Error]", error.message);
    return NextResponse.json({ error: "internal_error", message: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "unknown_error" }, { status: 500 });
}
