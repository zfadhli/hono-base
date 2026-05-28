export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID environment variable is required");

  const redirectUri = process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4200/api/auth/google/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface GoogleTokenResult {
  access_token: string;
  id_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4200/api/auth/google/callback";
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<GoogleTokenResult>;
}

export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getUserProfile(accessToken: string): Promise<GoogleUser> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Userinfo request failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<GoogleUser>;
}

export function parseIdToken(idToken: string): GoogleUser {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid id_token format");

  return JSON.parse(atob(parts[1]!)) as GoogleUser;
}
