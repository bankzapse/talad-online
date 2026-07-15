// กัน open-redirect: อนุญาตเฉพาะ path ภายในเว็บ (ขึ้นต้น "/" และไม่ใช่ "//" หรือมี scheme)
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  // ต้องเป็น relative path ภายในเท่านั้น
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback; // protocol-relative → ออกนอกเว็บได้
  if (next.includes("://")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}
