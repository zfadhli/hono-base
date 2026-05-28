import { type } from "arktype";
import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { getGoogleAuthUrl, exchangeCodeForTokens, getUserProfile } from "@/lib/oauth";
import { getCookie, setCookie } from "hono/cookie";
import { ErrorRes, SuccessRes } from "@/validators/common";
import { CodeParam } from "./schema.js";

const r = define.in("/api/auth");

r.get("/google/url", "Get Google OAuth URL")
  .tag("Auth")
  .response(200, "Google OAuth URL", type({ url: "string" }))
  .handle(async (c) => {
    try {
      const url = getGoogleAuthUrl();
      return c.json({ url });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  });

r.get("/google/callback", "Handle Google OAuth callback")
  .query(CodeParam)
  .tag("Auth")
  .response(200, "Access token and user profile", type({ accessToken: "string", user: type({ id: "number", name: "string", email: "string", avatar: "string | null" }) }))
  .response(400, "Missing code or token exchange failed", ErrorRes)
  .response(500, "Failed to create user", ErrorRes)
  .handle(async (c, { query }) => {
    const { code } = query;

    let tokens: { access_token: string };
    try {
      tokens = await exchangeCodeForTokens(code);
    } catch (e) {
      return c.json({ error: "Token exchange failed", detail: (e as Error).message }, 400);
    }

    let profile: { sub: string; email: string; name: string; picture?: string };
    try {
      profile = await getUserProfile(tokens.access_token);
    } catch (e) {
      return c.json({ error: "Failed to fetch user profile", detail: (e as Error).message }, 400);
    }

    const [existing] = await db.select().from(users).where(eq(users.googleId, profile.sub));

    let user: typeof existing;
    if (existing) {
      user = existing;
    } else {
      const [created] = await db.insert(users).values({
        googleId: profile.sub,
        name: profile.name,
        email: profile.email,
        avatar: profile.picture,
      }).returning();
      if (!created) return c.json({ error: "Failed to create user" }, 500);
      user = created;
    }

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, name: user.name });
    const refreshToken = await signRefreshToken({ sub: user.id });

    setCookie(c, "refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  });

r.post("/refresh", "Refresh access token")
  .tag("Auth")
  .response(200, "New access token and user profile", type({ accessToken: "string", user: type({ id: "number", name: "string", email: "string", avatar: "string | null" }) }))
  .response(401, "Invalid or expired refresh token", ErrorRes)
  .handle(async (c) => {
    const refreshToken = getCookie(c, "refreshToken");
    if (!refreshToken) return c.json({ error: "No refresh token" }, 401);

    let payload: { sub: number };
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return c.json({ error: "Invalid or expired refresh token" }, 401);
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
    if (!user) return c.json({ error: "User not found" }, 401);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, name: user.name });
    const newRefreshToken = await signRefreshToken({ sub: user.id });

    setCookie(c, "refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  });

r.post("/logout", "Log out and clear refresh token")
  .tag("Auth")
  .response(200, "Logged out", SuccessRes)
  .handle(async (c) => {
    setCookie(c, "refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/api/auth",
      maxAge: 0,
    });
    return c.json({ success: true });
  });

r.get("/me", "Get current user profile")
  .auth()
  .tag("Auth")
  .response(200, "User profile", type({ user: type({ id: "number", name: "string", email: "string", avatar: "string | null" }) }))
  .response(401, "Unauthorized", ErrorRes)
  .handle(async (c, { user }) => {
    return c.json({ user });
  });
