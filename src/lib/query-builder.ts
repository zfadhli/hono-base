import { type } from "arktype";
import { and, or, count, asc, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { ClientError } from "@/lib/errors";

type FilterMap = Record<string, (v: string) => SQL | undefined>;
type SortMap = Record<string, any>;
type IncludeMap = Record<string, any>;

export class AllowedQueryBuilder {
  private _filters: FilterMap = {};
  private _sorts: SortMap = {};
  private _includes: IncludeMap = {};
  private _fields: Record<string, boolean> = {};
  private _appends: Record<string, (row: any) => any | Promise<any>> = {};
  private _defaultSort?: string;
  private _transform?: (row: any) => any;

  allowedFilters(f: FilterMap): this {
    Object.assign(this._filters, f);
    return this;
  }

  allowedSorts(s: SortMap): this {
    Object.assign(this._sorts, s);
    return this;
  }

  allowedIncludes(i: IncludeMap): this {
    Object.assign(this._includes, i);
    return this;
  }

  allowedFields(f: Record<string, boolean>): this {
    Object.assign(this._fields, f);
    return this;
  }

  allowedAppends(a: Record<string, (row: any) => any | Promise<any>>): this {
    Object.assign(this._appends, a);
    return this;
  }

  defaultSort(sort: string): this {
    const key = sort.replace(/^[+-]/, "");
    if (!this._sorts[key]) {
      throw new Error(`Default sort '${key}' is not an allowed sort. Allowed: ${Object.keys(this._sorts).join(", ")}`);
    }
    this._defaultSort = sort;
    return this;
  }

  groupOr(key: string, targets: string[]): this {
    this._filters[key] = (v: string) => {
      const conditions = targets
        .map((t) => this._filters[t])
        .filter((fn): fn is (v: string) => SQL | undefined => fn !== undefined)
        .map((fn) => fn(v));
      return or(...conditions);
    };
    return this;
  }

  groupAnd(key: string, targets: string[]): this {
    this._filters[key] = (v: string) => {
      const conditions = targets
        .map((t) => this._filters[t])
        .filter((fn): fn is (v: string) => SQL | undefined => fn !== undefined)
        .map((fn) => fn(v));
      return and(...conditions);
    };
    return this;
  }

  transform(fn: (row: any) => any): this {
    this._transform = fn;
    return this;
  }

  getQuerySchema() {
    const obj: Record<string, string> = {
      "offset?": "string",
      "limit?": "string",
      "order?": "'asc' | 'desc'",
      "include?": "string",
      "fields?": "string",
      "append?": "string",
    };

    const sortKeys = Object.keys(this._sorts);
    if (sortKeys.length > 0) {
      obj["sort?"] = sortKeys.map((k) => `'${k}'`).join(" | ");
    }

    for (const key of Object.keys(this._filters)) {
      obj[`${key}?`] = "string";
    }

    return type(obj);
  }

  async execute(
    qb: any,
    table: any,
    query: Record<string, string | undefined>,
    opts?: { where?: SQL; orderBy?: any[] },
  ) {
    const offset = Number(query.offset ?? 0);
    const limit = Number(query.limit ?? 20);
    const isDefaultSort = query.sort === undefined && this._defaultSort !== undefined;
    const sortField = isDefaultSort ? this._defaultSort!.replace(/^[+-]/, "") : (query.sort ?? undefined);
    const sortDefaultDir = isDefaultSort && this._defaultSort!.startsWith("-") ? "desc" : "asc";
    const sortOrder = query.order ?? sortDefaultDir;
    const sortDir = sortOrder === "asc" ? asc : desc;

    if (sortField && !this._sorts[sortField]) {
      throw new ClientError(`Invalid sort field '${sortField}'. Allowed: ${Object.keys(this._sorts).join(", ")}`);
    }

    const conditions: (SQL | undefined)[] = [];
    if (opts?.where) conditions.push(opts.where);
    for (const [key, fn] of Object.entries(this._filters)) {
      const val = query[key];
      if (val !== undefined) conditions.push(fn(val));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let orderBy: any;
    if (opts?.orderBy) {
      orderBy = opts.orderBy;
    }
    if (sortField && this._sorts[sortField]) {
      orderBy = [sortDir(this._sorts[sortField])];
    }

    let withConfig: any;
    const includeParam = query.include;
    if (includeParam !== undefined) {
      withConfig = {};
      if (includeParam) {
        for (const key of includeParam.split(",").map((s) => s.trim())) {
          if (this._includes[key]) {
            withConfig[key] = this._includes[key];
          }
        }
      }
    } else if (Object.keys(this._includes).length > 0) {
      withConfig = { ...this._includes };
    }

    const rows = await qb.findMany({ where, limit, offset, orderBy, with: withConfig });
    const [totalRow] = await db.select({ total: count() }).from(table).where(where);
    const total = totalRow!.total;

    let data = rows;

    if (this._transform) {
      data = data.map(this._transform);
    }

    const appendParam = query.append;
    if (appendParam && Object.keys(this._appends).length > 0) {
      const requested = appendParam.split(",").map((s) => s.trim());
      data = await Promise.all(
        data.map(async (row: any) => {
          for (const key of requested) {
            if (this._appends[key]) {
              row = { ...row, [key]: await this._appends[key](row) };
            }
          }
          return row;
        }),
      );
    }

    const fieldsParam = query.fields;
    if (fieldsParam && Object.keys(this._fields).length > 0) {
      const requested = fieldsParam.split(",").map((s) => s.trim());
      const allowed = Object.keys(this._fields);
      const selected = requested.filter((f) => allowed.includes(f));
      if (selected.length > 0) {
        data = data.map((row: any) => {
          const picked: Record<string, any> = {};
          for (const field of selected) {
            picked[field] = row[field];
          }
          return picked;
        });
      }
    }

    return { data, total, offset, limit };
  }
}

export function queryBuilder() {
  return new AllowedQueryBuilder();
}
