/**
 * ติดตั้ง Rich Menu ของ LINE OA — รันซ้ำได้ (ลบของเก่าทิ้งก่อนเสมอ)
 *
 *   LINE_CHANNEL_ACCESS_TOKEN=xxx node scripts/richmenu.mjs
 *
 * สร้าง 2 เมนู:
 *   • buyer  — เมนูเริ่มต้นของทุกคนที่เพิ่มเพื่อน OA
 *   • seller — ผูกรายคนตอนล็อกอินเป็นผู้ขาย (ดู linkSellerRichMenu ใน src/lib/line.ts)
 */
import fs from "fs";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const APP = process.env.APP_URL || "https://talad-online.vercel.app";
if (!TOKEN) {
  console.error("❌ ต้องส่ง LINE_CHANNEL_ACCESS_TOKEN มาด้วย");
  process.exit(1);
}

const api = (path, init = {}) =>
  fetch(`https://api.line.me${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers ?? {}) },
  });

// พื้นที่กดของเมนู 6 ช่อง (2500×1686) — ช่องละ 833×843
const cell = (col, row) => ({
  x: col * 833,
  y: row * 843,
  width: col === 2 ? 834 : 833,
  height: 843,
});
const link = (label, uri) => ({ type: "uri", label, uri });

const SELLER = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "talad-seller",
  chatBarText: "เมนูผู้ขาย",
  areas: [
    { bounds: cell(0, 0), action: link("ลงประกาศใหม่", `${APP}/sell/new`) },
    { bounds: cell(1, 0), action: link("รายการสั่งซื้อ", `${APP}/sell/orders`) },
    { bounds: cell(2, 0), action: link("ร้านของฉัน", `${APP}/sell`) },
    { bounds: cell(0, 1), action: link("ข้อมูลร้าน", `${APP}/sell/profile`) },
    { bounds: cell(1, 1), action: link("สมาชิก", `${APP}/sell/membership`) },
    { bounds: cell(2, 1), action: link("ช่วยเหลือ", `${APP}/help`) },
  ],
};

const BUYER = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: "talad-buyer",
  chatBarText: "เมนู",
  areas: [
    { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: link("เลือกซื้อสินค้า", APP) },
    { bounds: { x: 833, y: 0, width: 833, height: 843 }, action: link("คำสั่งซื้อของฉัน", `${APP}/orders`) },
    { bounds: { x: 1666, y: 0, width: 834, height: 843 }, action: link("เปิดร้าน", `${APP}/login`) },
  ],
};

async function create(def, imagePath) {
  const res = await api("/v2/bot/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(def),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`สร้างเมนูไม่สำเร็จ: ${JSON.stringify(body)}`);
  const id = body.richMenuId;

  const up = await fetch(`https://api-data.line.me/v2/bot/richmenu/${id}/content`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "image/png" },
    body: fs.readFileSync(imagePath),
  });
  if (!up.ok) throw new Error(`อัปรูปไม่สำเร็จ: ${await up.text()}`);

  console.log(`✅ ${def.name} → ${id}`);
  return id;
}

// ---- ลบของเก่าก่อน กันเมนูค้างซ้ำ (LINE จำกัด 1000 เมนู/OA) ----
const list = await api("/v2/bot/richmenu/list").then((r) => r.json());
for (const m of list.richmenus ?? []) {
  await api(`/v2/bot/richmenu/${m.richMenuId}`, { method: "DELETE" });
  console.log(`🗑  ลบเมนูเก่า ${m.name || m.richMenuId}`);
}

const buyerId = await create(BUYER, "brand/richmenu-buyer.png");
const sellerId = await create(SELLER, "brand/richmenu-seller.png");

// เมนูผู้ซื้อเป็นค่าเริ่มต้นของทุกคน
const def = await api(`/v2/bot/user/all/richmenu/${buyerId}`, { method: "POST" });
console.log(def.ok ? "✅ ตั้งเมนูผู้ซื้อเป็นค่าเริ่มต้นแล้ว" : `❌ ตั้ง default ไม่ได้: ${await def.text()}`);

console.log(`
──────────────────────────────────────────────
เอา id ผู้ขายไปใส่ Vercel เพื่อให้ระบบผูกให้อัตโนมัติตอนล็อกอิน:

  npx vercel env add LINE_RICHMENU_SELLER production
  (วาง)  ${sellerId}

  npx vercel --prod
──────────────────────────────────────────────`);
