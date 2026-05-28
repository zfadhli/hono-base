import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { signJwt } from "@/lib/jwt";
import { getGoogleAuthUrl, exchangeCodeForTokens, getUserProfile } from "@/lib/oauth";
import { CodeParam } from "./schema.js";

const r = define.in("/api/auth");

r.get("/google/url", "Get Google OAuth URL")
  .tag("Auth")
  .response(200, "Google OAuth URL")
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
  .response(200, "JWT token and user profile")
  .response(400, "Missing code or token exchange failed")
  .response(500, "Failed to create user")
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

    const token = await signJwt({ sub: user.id, email: user.email, name: user.name });

    return c.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  });

r.get("/me", "Get current user profile")
  .auth()
  .tag("Auth")
  .response(200, "User profile")
  .response(401, "Unauthorized")
  .handle(async (c, { user }) => {
    return c.json({ user });
  });
