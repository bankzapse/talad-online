"use client";

import { useEffect, useRef, useState } from "react";

type Item = { id: number; name: string };

export interface LocationInitial {
  provinceId: number;
  districtId: number;
  subdistrictId: number;
  marketName: string;
}

// จังหวัด → อำเภอ → ตำบล (dropdown ต่อเนื่อง) + ชื่อตลาด/พื้นที่ พิมพ์เอง
//
// initial = ค่าเดิม (ที่ตั้งร้าน หรือประกาศที่กำลังแก้ไข)
// initialDistricts/initialSubdistricts = รายการของค่าเดิม ส่งมาจาก server เลย
//   เหตุผล: ถ้าให้ client ไป fetch เอาตอน mount ค่าที่เติมไว้จะถูก effect ล้างทิ้ง
//   (effect ของ React รันซ้ำได้) และผู้ใช้จะเห็นช่องอำเภอ/ตำบลว่างทั้งที่ตั้งค่าไว้แล้ว
export default function LocationPicker({
  provinces,
  initial,
  initialDistricts = [],
  initialSubdistricts = [],
}: {
  provinces: Item[];
  initial?: LocationInitial;
  initialDistricts?: Item[];
  initialSubdistricts?: Item[];
}) {
  const [provinceId, setProvinceId] = useState(initial ? String(initial.provinceId) : "");
  const [districtId, setDistrictId] = useState(initial ? String(initial.districtId) : "");
  const [subdistrictId, setSubdistrictId] = useState(
    initial ? String(initial.subdistrictId) : ""
  );
  const [districts, setDistricts] = useState<Item[]>(initialDistricts);
  const [subdistricts, setSubdistricts] = useState<Item[]>(initialSubdistricts);
  const [loading, setLoading] = useState<"d" | "s" | null>(null);
  // ข้ามการล้างค่าเฉพาะรอบแรก — ใช้ ref ไม่ใช่ state เพราะต้องไม่ทำให้ re-render
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) return; // ค่าเดิมกับรายการมาครบจาก server แล้ว
    setDistrictId("");
    setSubdistrictId("");
    setDistricts([]);
    setSubdistricts([]);
    if (!provinceId) return;
    setLoading("d");
    fetch(`/api/geo?province=${provinceId}`)
      .then((r) => r.json())
      .then((d) => setDistricts(d.items ?? []))
      .finally(() => setLoading(null));
  }, [provinceId]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSubdistrictId("");
    setSubdistricts([]);
    if (!districtId) return;
    setLoading("s");
    fetch(`/api/geo?district=${districtId}`)
      .then((r) => r.json())
      .then((d) => setSubdistricts(d.items ?? []))
      .finally(() => setLoading(null));
  }, [districtId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="label">จังหวัด *</label>
          <select
            name="provinceId"
            required
            className="input"
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
          >
            <option value="">เลือกจังหวัด</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="label">อำเภอ/เขต *</label>
          <select
            name="districtId"
            required
            disabled={!provinceId || loading === "d"}
            className="input disabled:bg-slate-50 disabled:text-slate-400"
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
          >
            <option value="">
              {loading === "d" ? "กำลังโหลด…" : provinceId ? "เลือกอำเภอ/เขต" : "เลือกจังหวัดก่อน"}
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="label">ตำบล/แขวง *</label>
          <select
            name="subdistrictId"
            required
            disabled={!districtId || loading === "s"}
            className="input disabled:bg-slate-50 disabled:text-slate-400"
            value={subdistrictId}
            onChange={(e) => setSubdistrictId(e.target.value)}
          >
            <option value="">
              {loading === "s" ? "กำลังโหลด…" : districtId ? "เลือกตำบล/แขวง" : "เลือกอำเภอก่อน"}
            </option>
            {subdistricts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">ชื่อตลาด / จุดนัดรับ *</label>
        <input
          name="marketName"
          required
          maxLength={80}
          defaultValue={initial?.marketName ?? ""}
          className="input"
          placeholder="เช่น ตลาดสดเทศบาล, หน้าโลตัสสาขา..., ตลาดนัดวันอาทิตย์"
        />
        <p className="mt-1 text-xs text-slate-400">
          พิมพ์ชื่อตลาดหรือจุดที่นัดรับได้เลย — ผู้ซื้อจะเห็นข้อความนี้
        </p>
      </div>
    </div>
  );
}
