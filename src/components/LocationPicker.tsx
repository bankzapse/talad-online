"use client";

import { useEffect, useState } from "react";

type Item = { id: number; name: string };

// จังหวัด → อำเภอ → ตำบล (dropdown ต่อเนื่อง) + ชื่อตลาด/พื้นที่ พิมพ์เอง
export default function LocationPicker({ provinces }: { provinces: Item[] }) {
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subdistrictId, setSubdistrictId] = useState("");
  const [districts, setDistricts] = useState<Item[]>([]);
  const [subdistricts, setSubdistricts] = useState<Item[]>([]);
  const [loading, setLoading] = useState<"d" | "s" | null>(null);

  useEffect(() => {
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
