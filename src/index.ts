import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { define } from "@/lib/scalar-docs";
import "@/routes/post/index";
import "@/routes/tags/index";
import "@/routes/post/[postId]/comments/index";
import "@/routes/post/[postId]/likes/index";
import "@/routes/auth/index";

const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors());

define.mount(app, {
  title: "Hono Blog API",
  version: "1.0.0",
  docsEndpoint: "/docs",
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 4200);

console.log(`Server running on http://localhost:${port}`);

export default { port, fetch: app.fetch };
