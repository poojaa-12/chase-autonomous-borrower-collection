import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "@/lib/runtime-readiness";

export async function GET() {
  const readiness = getRuntimeReadiness(process.env);
  return NextResponse.json(
    {
      ok: readiness.ok,
      service: "chase",
      missing: readiness.missing
    },
    { status: readiness.ok ? 200 : 503 }
  );
}
