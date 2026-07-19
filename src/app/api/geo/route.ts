import { NextResponse } from "next/server";
import { getDistricts, getSubdistricts } from "@/lib/geo";

// /api/geo?province=1  → อำเภอ
// /api/geo?district=1001 → ตำบล
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const province = Number(searchParams.get("province") || 0);
  const district = Number(searchParams.get("district") || 0);

  if (district > 0) return NextResponse.json({ items: getSubdistricts(district) });
  if (province > 0) return NextResponse.json({ items: getDistricts(province) });
  return NextResponse.json({ items: [] });
}
