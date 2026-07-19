import geo from "@/data/thai-geo.json";

// -----------------------------------------------------------------------------
// เขตการปกครองไทย: จังหวัด → อำเภอ → ตำบล
// โหลดฝั่ง server เท่านั้น (ไฟล์ ~500KB) แล้วส่งเฉพาะรายการที่ต้องใช้ให้ client
// -----------------------------------------------------------------------------

export interface GeoItem {
  id: number;
  name: string;
}

const P = geo.provinces as { i: number; n: string }[];
const D = geo.districts as { i: number; n: string; p: number }[];
const S = geo.subdistricts as { i: number; n: string; d: number; z?: number }[];

const byName = (a: GeoItem, b: GeoItem) => a.name.localeCompare(b.name, "th");

export function getProvinces(): GeoItem[] {
  return P.map((x) => ({ id: x.i, name: x.n })).sort(byName);
}

export function getDistricts(provinceId: number): GeoItem[] {
  return D.filter((x) => x.p === provinceId)
    .map((x) => ({ id: x.i, name: x.n }))
    .sort(byName);
}

export function getSubdistricts(districtId: number): GeoItem[] {
  return S.filter((x) => x.d === districtId)
    .map((x) => ({ id: x.i, name: x.n }))
    .sort(byName);
}

// แปลง id → ชื่อ (ใช้ตอนบันทึกประกาศ เก็บเป็นชื่อไทยตรงๆ อ่านง่าย)
export function provinceName(id: number): string | null {
  return P.find((x) => x.i === id)?.n ?? null;
}
export function districtName(id: number): string | null {
  return D.find((x) => x.i === id)?.n ?? null;
}
export function subdistrictName(id: number): string | null {
  return S.find((x) => x.i === id)?.n ?? null;
}

// ชื่อ → id (ประกาศเก็บเป็นชื่อไทย) — ใช้เติมค่าเดิมในฟอร์มแก้ไขประกาศ
// จับคู่ตามลำดับชั้นเพื่อกันชื่ออำเภอ/ตำบลซ้ำข้ามจังหวัด (เช่น "เมือง" มีเกือบทุกจังหวัด)
export function findGeoIds(
  province: string,
  district: string,
  subdistrict: string
): { provinceId: number; districtId: number; subdistrictId: number } | null {
  const p = P.find((x) => x.n === province);
  if (!p) return null;
  const d = D.find((x) => x.p === p.i && x.n === district);
  if (!d) return null;
  const s = S.find((x) => x.d === d.i && x.n === subdistrict);
  if (!s) return null;
  return { provinceId: p.i, districtId: d.i, subdistrictId: s.i };
}

// ตรวจว่า id สอดคล้องกันจริง (กันยิงค่ามั่ว)
export function isValidGeo(provinceId: number, districtId: number, subdistrictId: number) {
  const d = D.find((x) => x.i === districtId);
  const s = S.find((x) => x.i === subdistrictId);
  return Boolean(d && s && d.p === provinceId && s.d === districtId);
}
