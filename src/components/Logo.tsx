// เครื่องหมายการค้า "Talad" — ถุงช้อปปิ้งกับเครื่องหมายถูก สื่อ "ซื้อของอย่างมั่นใจ"
// ไฟล์ต้นฉบับความละเอียดสูงอยู่ใน brand/ (PNG 1024/512 สำหรับ LINE)
// ใช้ซ้ำได้ทุกที่ ปรับขนาดผ่าน prop เดียว (nav / footer / ใบเสร็จ / หน้า error)
export default function Logo({
  size = 32,
  rounded = true,
}: {
  size?: number;
  rounded?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ตลาดออนไลน์"
      className="shrink-0"
    >
      <rect width="64" height="64" rx={rounded ? 15 : 0} fill="#059669" />
      <path
        d="M24.5 28v-3.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5V28"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <rect x="23" y="27.5" width="18" height="19" rx="3.6" fill="#fff" />
      <path
        d="M27.2 37.2l3.8 3.8 7.4-8"
        fill="none"
        stroke="#059669"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
