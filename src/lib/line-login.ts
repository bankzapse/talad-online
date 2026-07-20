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

export function buildAuthUrl(redirectUri: string, state: string): string {
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
