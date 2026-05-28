import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { define } from "@/lib/scalar-docs";
import { rateLimit } from "@/middleware/rate-limit";
import "@/routes/post/index";
import "@/routes/tags/index";
import "@/routes/post/[postId]/comments/index";
import "@/routes/post/[postId]/likes/index";
import "@/routes/auth/index";

const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors());
app.use("/api/auth/*", rateLimit({ window: 60, max: 5 }));
app.use("/api/posts*", rateLimit({ window: 60, max: 20 }));
app.use("/api/*", rateLimit({ window: 60, max: 60 }));

define.mount(app, {
  title: "Hono Blog API",
  version: "1.0.0",
  docsEndpoint: "/docs",
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 4200);

console.log(`Server running on http://localhost:${port}`);

export default { port, fetch: app.fetch };
