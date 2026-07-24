"use client";

import { useState } from "react";

// ช่องกรอกเลขบัญชี — รับเฉพาะตัวเลข เว้นวรรคเป็นกลุ่มละ 4 ให้อ่านง่ายตอนกดโอน
//
// เก็บ/แสดงพร้อมช่องว่าง ("123 4567 890") — แอปธนาคารรับได้ทั้งมีและไม่มีช่องว่าง
// จำกัด 15 หลัก (บัญชีไทยยาวสุด ~12-13 หลัก เผื่อไว้)
function format(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default function BankAccountInput({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(() => format(defaultValue));

  return (
    <input
      name={name}
      value={value}
      onChange={(e) => setValue(format(e.target.value))}
      // มือถือเด้งแป้นตัวเลขขึ้นมาให้เลย ไม่ต้องสลับแป้น
      inputMode="numeric"
      autoComplete="off"
      className="input tracking-wide"
      placeholder="123 4567 890"
    />
  );
}
