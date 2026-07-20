# ไฟล์แบรนด์ — Talad

| ไฟล์ | ขนาด | ใช้ทำอะไร |
|---|---|---|
| `talad-logo-1024.png` | 1024×1024 | **ไอคอน LINE channel / LINE OA** (LINE ต้องการ ≥500px) — มีชื่อไทย |
| `talad-logo-512.png` | 512×512 | สำรอง — เว็บ/แอปสโตร์ที่ขอ 512 |
| `talad-mark-1024.png` | 1024×1024 | เฉพาะสัญลักษณ์ ไม่มีตัวอักษร — ใช้ตอนพื้นที่แคบ |
| `logo-square.svg` | vector | ต้นฉบับ (โลโก้เต็ม) แก้แล้วสร้าง PNG ใหม่ได้ |
| `logo-mark.svg` | vector | ต้นฉบับ (เฉพาะสัญลักษณ์) |
| `og.svg` | vector | ต้นฉบับแบนเนอร์ตอนแชร์ลิงก์ |
| `../public/og.png` | 1200×630 | รูปที่ขึ้นตอนแชร์ลิงก์ใน LINE/Facebook |
| `../public/apple-touch-icon.png` | 180×180 | ไอคอนตอนเพิ่มลงหน้าจอ iPhone |

สีแบรนด์: `#059669` (เขียว) · ขาว `#ffffff`

ฟอนต์ไทยในโลโก้ใช้ `Thonburi` (มีมากับ macOS)
ถ้าสร้าง PNG บนเครื่องที่ไม่มีฟอนต์นี้ ตัวไทยจะกลายเป็นกล่องว่าง — ตรวจรูปทุกครั้งหลังสร้างใหม่

## สร้าง PNG ใหม่หลังแก้ SVG

```bash
node -e '
import("sharp").then(async ({default:sharp})=>{
  const fs=await import("fs");
  const jobs=[["brand/logo-square.svg","brand/talad-logo-1024.png",1024],
              ["brand/logo-square.svg","brand/talad-logo-512.png",512],
              ["brand/logo-mark.svg","brand/talad-mark-1024.png",1024],
              ["brand/logo-mark.svg","public/apple-touch-icon.png",180]];
  for(const [s,o,z] of jobs){
    await sharp(Buffer.from(fs.readFileSync(s)),{density:400}).resize(z,z).png().toFile(o);
    console.log("✓",o);
  }
})'
```
