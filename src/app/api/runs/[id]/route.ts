import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRunSnapshot } from "./handler";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const snapshot = await getRunSnapshot({ db }, id);
  if (!snapshot) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
