// กัน open-redirect: อนุญาตเฉพาะ path ภายในเว็บ (ขึ้นต้น "/" และไม่ใช่ "//" หรือมี scheme)
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  // ต้องเป็น relative path ภายในเท่านั้น
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback; // protocol-relative → ออกนอกเว็บได้
  if (next.includes("://")) return fallback;
  if (next.includes("\\")) return fallback;
  // ชี้กลับหน้า login เองทำให้เด้งวนไม่จบ (login → next=/login → login …)
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) {
    return fallback;
  }
  return next;
}

// พาไปล็อกอินโดยไม่ต้องแวะหน้า /login ก่อน
// ยิงเข้า /api/auth/line ตรง ๆ แล้วเด้งต่อไป LINE ทันที — ถ้ายังไม่ได้ตั้งค่า LINE Login
// route นั้นจะพากลับมาหน้า /login เอง (โหมด demo) เลยใช้ลิงก์เดียวได้ทุกกรณี
export function signInUrl(opts: { buyer?: boolean; next?: string } = {}): string {
  const p = new URLSearchParams();
  if (opts.buyer) p.set("buyer", "1");
  if (opts.next) p.set("next", safeNext(opts.next));
  const q = p.toString();
  return `/api/auth/line${q ? `?${q}` : ""}`;
}
