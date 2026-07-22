// -----------------------------------------------------------------------------
// LINE Login (OAuth 2.1) helpers
// เปิดใช้งานเมื่อกรอก LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET
// Callback URL ที่ต้องลงทะเบียนใน LINE console: {origin}/api/auth/line/callback
// -----------------------------------------------------------------------------

export function isLineLoginConfigured(): boolean {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID && process.env.LINE_LOGIN_CHANNEL_SECRET
  );
}

// มือถือ = LINE เปิดแอปให้ล็อกอินอัตโนมัติ / คอมพิวเตอร์ = ไม่มีแอปให้เปิด
export function isMobileUA(ua: string | null | undefined): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Line\//i.test(ua ?? "");
}

export function buildAuthUrl(
  redirectUri: string,
  state: string,
  opts: { qrFirst?: boolean } = {}
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    // ให้หน้ายินยอมของ LINE มีช่อง "เพิ่มเพื่อน" OA ติ๊กมาให้เลย
    // ไม่งั้นผู้ใช้ต้องไปเพิ่มเพื่อนเองทีหลัง แล้วจะไม่ได้รับแจ้งเตือนโดยไม่รู้ตัว
    // ทำงานเมื่อผูก Login channel กับ LINE OA ไว้ในคอนโซลแล้ว (ไม่ผูกก็ไม่พัง แค่ถูกเมิน)
    bot_prompt: "aggressive",
  });

  // บนคอมฯ LINE ขึ้นหน้ากรอกอีเมล+รหัสผ่าน ซึ่งคนไทยส่วนใหญ่จำไม่ได้
  // (สมัคร LINE ด้วยเบอร์มาตลอด ไม่เคยตั้งอีเมล) → ให้สแกน QR ด้วยมือถือแทน
  //
  // ต้องใส่ทั้งสองตัว: initial_amr_display เลือกว่าเปิดหน้าไหนก่อน
  // ส่วน switch_amr=false ซ่อนช่องอีเมลที่ LINE วางไว้ข้าง ๆ ในหน้าเดียวกัน
  // ใส่แค่ตัวแรกยังเห็นช่องอีเมลอยู่ดี ผู้ใช้เลยคิดว่าไม่มีทางอื่น
  //
  // บนมือถือห้ามใส่ — จะกลายเป็นให้สแกน QR ด้วยเครื่องตัวเอง
  // แทนที่ LINE จะเปิดแอปให้ล็อกอินอัตโนมัติ
  if (opts.qrFirst) {
    params.set("initial_amr_display", "lineqr");
    params.set("switch_amr", "false");
  }

  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string } | null> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getLineProfile(
  accessToken: string
): Promise<{ userId: string; displayName: string } | null> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { userId: data.userId, displayName: data.displayName };
}
