// เครื่องหมายการค้า "ตลาดออนไลน์" — ตะกร้าตลาดกับใบไม้ สื่อของสดจากตลาด
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
        d="M16 26h32l-4 24a4 4 0 0 1-4 3.4H24a4 4 0 0 1-4-3.4L16 26Z"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M12.5 26h39" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 26c0-7 4-12 10.5-13.5C42 19 38 25 32 26Z" fill="#fff" />
      <path d="M32 26c-.5-5.5-3.5-9-8.5-10.5.5 6.5 3.5 9.5 8.5 10.5Z" fill="#fff" />
    </svg>
  );
}
