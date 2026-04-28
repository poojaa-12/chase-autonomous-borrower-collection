import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { inngest } from "@/inngest/client";
import { handleBorrowerReply, payloadSchema } from "./handler";

export async function POST(request: Request) {
  try {
    const body = payloadSchema.parse(await request.json());
    const result = await handleBorrowerReply({ db, inngest }, body);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
