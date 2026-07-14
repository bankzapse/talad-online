import { NextResponse } from "next/server";
import { reportListing } from "@/lib/data";

export async function POST(req: Request) {
  const { listingId, reason } = await req.json();
  if (!listingId || !reason) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  reportListing(listingId, reason);
  return NextResponse.json({ ok: true });
}
