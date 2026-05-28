import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return encoder.encode(secret);
}

export interface AccessPayload {
  sub: number;
  email: string;
  name: string;
}

export interface RefreshPayload {
  sub: number;
  type: "refresh";
}

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());
}

export async function signRefreshToken(payload: { sub: number }): Promise<string> {
  return await new SignJWT({ sub: payload.sub, type: "refresh" } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as AccessPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const result = payload as unknown as RefreshPayload;
  if (result.type !== "refresh") throw new Error("Invalid token type");
  return result;
}
