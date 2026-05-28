import { Hono } from "hono";
import { sValidator as stdValidator } from "@hono/standard-validator";
import { apiReference } from "@scalar/hono-api-reference";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { auth } from "../middleware/auth.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Context } from "hono";

// ─── Types ──────────────────────────────────────────────────────────────────

type InferOutput<S> = S extends StandardSchemaV1<any, infer O> ? O : never;

interface RouteDef {
  method: string;
  path: string;
  description?: string;
  tags: string[];
  param?: StandardSchemaV1;
  query?: StandardSchemaV1;
  json?: StandardSchemaV1;
  responses: { status: number; description: string }[];
  middleware: unknown[];
  requiresAuth: boolean;
  handler: (c: Context) => Response | Promise<Response>;
}

interface MountOptions {
  title?: string;
  version?: string;
  docsEndpoint?: string;
  specEndpoint?: string;
}

// ─── Route Builder ──────────────────────────────────────────────────────────

class RouteBuilder<T extends Record<string, unknown> = {}> {
  private def: Partial<RouteDef> = {};
  private pre: unknown[] = [];

  constructor(method: string, path: string, description?: string) {
    this.def.method = method;
    this.def.path = path;
    this.def.description = description;
    this.def.tags = [];
    this.def.responses = [];
    this.def.middleware = [];
    this.def.requiresAuth = false;
  }

  param<S extends StandardSchemaV1>(schema: S): RouteBuilder<T & { param: InferOutput<S> }> {
    this.def.param = schema;
    return this as unknown as RouteBuilder<T & { param: InferOutput<S> }>;
  }

  query<S extends StandardSchemaV1>(schema: S): RouteBuilder<T & { query: InferOutput<S> }> {
    this.def.query = schema;
    return this as unknown as RouteBuilder<T & { query: InferOutput<S> }>;
  }

  json<S extends StandardSchemaV1>(schema: S): RouteBuilder<T & { json: InferOutput<S> }> {
    this.def.json = schema;
    return this as unknown as RouteBuilder<T & { json: InferOutput<S> }>;
  }

  use(mw: unknown): this {
    this.pre.push(mw);
    return this;
  }

  exists(paramName: string, table: any, options?: { key?: string }): this {
    const key = options?.key ?? "id";
    const varName = paramName.replace(/Id$/, "");

    this.pre.push(async (c: Context, next: () => Promise<void>) => {
      const raw = c.req.param(paramName)!;
      const val = Number(raw);
      if (!Number.isFinite(val)) return c.json({ error: `Invalid ${paramName}` }, 400);
      const [row] = await db.select().from(table).where(eq(table[key], val));
      if (!row) return c.json({ error: `${varName.charAt(0).toUpperCase() + varName.slice(1)} not found` }, 404);
      c.set(varName, row);
      await next();
    });

    return this;
  }

  auth(): this {
    this.def.requiresAuth = true;
    this.pre.push(auth);
    return this;
  }

  response(status: number, description: string): this {
    this.def.responses!.push({ status, description });
    return this;
  }

  tag(...tags: string[]): this {
    this.def.tags!.push(...tags);
    return this;
  }

  handle(handler: (c: Context, data: T) => Response | Promise<Response>): void {
    this.def.handler = async (c: Context) => {
      const data: Record<string, unknown> = {};
      if (this.def.param) data.param = (c.req.valid as (t: string) => unknown)("param");
      if (this.def.query) data.query = (c.req.valid as (t: string) => unknown)("query");
      if (this.def.json) data.json = (c.req.valid as (t: string) => unknown)("json");
      return handler(c, data as T);
    };

    const chain: unknown[] = [...this.pre];
    if (this.def.param) chain.push(stdValidator("param", this.def.param));
    if (this.def.query) chain.push(stdValidator("query", this.def.query));
    if (this.def.json) chain.push(stdValidator("json", this.def.json));
    chain.push(this.def.handler);
    this.def.middleware = chain;

    registry.push(this.def as RouteDef);
  }
}

// ─── Global Registry ────────────────────────────────────────────────────────

const registry: RouteDef[] = [];

// ─── ArkType JSON → JSON Schema Converter ───────────────────────────────────

type ArkNode = string | number | boolean | ArkNode[] | { [key: string]: unknown };

function toJsonSchema(node: ArkNode): Record<string, unknown> {
  if (typeof node === "string") {
    const typeMap: Record<string, string> = {
      string: "string",
      number: "number",
      bigint: "integer",
      boolean: "boolean",
      null: "null",
      undefined: "null",
    };
    return { type: typeMap[node] ?? "string" };
  }

  if (Array.isArray(node)) {
    if (
      node.length === 2 &&
      isObject(node[0]) && (node[0] as Record<string, unknown>).unit === false &&
      isObject(node[1]) && (node[1] as Record<string, unknown>).unit === true
    ) {
      return { type: "boolean" };
    }
    return { anyOf: node.map(toJsonSchema) };
  }

  if (!isObject(node)) return {};

  const obj = node as Record<string, unknown>;
  const schema: Record<string, unknown> = {};

  if (obj.domain === "object") {
    schema.type = "object";
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const prop of (obj.required ?? []) as ArkNode[]) {
      const p = prop as Record<string, unknown>;
      if (typeof p.key === "string") {
        properties[p.key] = toJsonSchema(p.value as ArkNode);
        required.push(p.key);
      }
    }

    for (const prop of (obj.optional ?? []) as ArkNode[]) {
      const p = prop as Record<string, unknown>;
      if (typeof p.key === "string") {
        properties[p.key] = toJsonSchema(p.value as ArkNode);
      }
    }

    schema.properties = properties;
    if (required.length) schema.required = required;
    return schema;
  }

  if (obj.sequence) {
    schema.type = "array";
    schema.items = toJsonSchema(obj.sequence as ArkNode);
    return schema;
  }

  if (obj.domain && typeof obj.domain === "string") {
    schema.type = obj.domain;

    if (typeof obj.minLength === "number") schema.minLength = obj.minLength;
    if (typeof obj.maxLength === "number") schema.maxLength = obj.maxLength;

    if (obj.min !== undefined) {
      if (isExclusive(obj.min)) {
        schema.exclusiveMinimum = (obj.min as Record<string, unknown>).rule;
      } else {
        schema.minimum = obj.min;
      }
    }

    if (obj.max !== undefined) {
      if (isExclusive(obj.max)) {
        schema.exclusiveMaximum = (obj.max as Record<string, unknown>).rule;
      } else {
        schema.maximum = obj.max;
      }
    }

    if (Array.isArray(obj.pattern) && obj.pattern.length > 0) {
      schema.pattern = (obj.pattern[0] as Record<string, unknown>).rule;
    }

    if (isObject(obj.meta) && typeof (obj.meta as Record<string, unknown>).format === "string") {
      schema.format = (obj.meta as Record<string, unknown>).format;
    }

    return schema;
  }

  return schema;
}

function isExclusive(v: unknown): boolean {
  return isObject(v) && (v as Record<string, unknown>).exclusive === true && "rule" in (v as Record<string, unknown>);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getArkJson(schema: StandardSchemaV1): ArkNode {
  return ((schema as unknown as Record<string, unknown>).json ?? {}) as ArkNode;
}

// ─── OpenAPI Spec Generator ─────────────────────────────────────────────────

function generateSpec(routes: RouteDef[], opts: MountOptions): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    const method = route.method.toLowerCase();
    const path = route.path;
    const pathParams = [...path.matchAll(/:(\w+)/g)].map((m) => m[1]!);

    const operationId = `${method}_${path
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")}`;

    const opParams: Record<string, unknown>[] = [];

    for (const name of pathParams) {
      opParams.push({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      });
    }

    if (route.query) {
      const qs = toJsonSchema(getArkJson(route.query));
      const props = (qs.properties ?? {}) as Record<string, unknown>;
      const req = (qs.required ?? []) as string[];
      for (const [name, prop] of Object.entries(props)) {
        opParams.push({
          name,
          in: "query",
          required: req.includes(name),
          schema: prop,
        });
      }
    }

    const responses: Record<string, unknown> = {};
    for (const resp of route.responses) {
      responses[String(resp.status)] = {
        description: resp.description,
        content: { "application/json": { schema: { type: "object" } } },
      };
    }

    const operation: Record<string, unknown> = {
      operationId,
      summary: route.description ?? "",
      tags: route.tags,
      parameters: opParams.length > 0 ? opParams : undefined,
      responses,
      security: route.requiresAuth ? [{ bearerAuth: [] }] : undefined,
    };

    if (route.json) {
      operation.requestBody = {
        content: { "application/json": { schema: toJsonSchema(getArkJson(route.json)) } },
      };
    }

    if (!paths[path]) paths[path] = {};
    paths[path]![method] = operation;
  }

  return {
    openapi: "3.1.0",
    info: { title: opts.title ?? "API", version: opts.version ?? "1.0.0" },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}

// ─── Define Singleton ───────────────────────────────────────────────────────

function createBuilder(method: string, path: string, description?: string) {
  return new RouteBuilder(method, path, description);
}

export const define = {
  get(path: string, description?: string) {
    return createBuilder("GET", path, description);
  },
  post(path: string, description?: string) {
    return createBuilder("POST", path, description);
  },
  patch(path: string, description?: string) {
    return createBuilder("PATCH", path, description);
  },
  delete(path: string, description?: string) {
    return createBuilder("DELETE", path, description);
  },

  mount(app: Hono, opts: MountOptions = {}) {
    const specEndpoint = opts.specEndpoint ?? "/openapi.json";
    const docsEndpoint = opts.docsEndpoint ?? "/docs";

    for (const route of registry) {
      const method = route.method.toLowerCase() as "get" | "post" | "patch" | "delete";
      (app[method] as (...args: unknown[]) => unknown)(route.path, ...route.middleware);
    }

    const spec = generateSpec([...registry], opts);

    app.get(specEndpoint, (c) => c.json(spec));
    app.get(docsEndpoint, apiReference({ spec: { url: specEndpoint } }) as never);
  },
};
