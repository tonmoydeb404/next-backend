// Auto-generates public/openapi.json by scanning every `route.ts` under src/app/backend/**
// and reading the `__openapiMeta` attached by `createHandler` — no manual path registration.
import { config as loadEnv } from "dotenv";
import fg from "fast-glob";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDocument, type ZodOpenApiPathsObject } from "zod-openapi";
import type { RouteHandler } from "../src/lib/api/create-handler";

const ROOT = join(import.meta.dirname, "..");

// Next.js auto-loads these for `next dev`/`next build`; replicate that here since this
// script runs standalone via tsx and importing route.ts files needs the same env vars.
loadEnv({ path: join(ROOT, ".env.local"), quiet: true });
loadEnv({ path: join(ROOT, ".env"), quiet: true });

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];
const ROUTES_GLOB = "src/app/backend/**/route.ts";
const OUTPUT_PATH = join(ROOT, "public/openapi.json");

// `src/app/backend/api/v1/geography/regions/[code]/route.ts` -> `/backend/api/v1/geography/regions/{code}`
function toOpenApiPath(routeFile: string): string {
  const withoutRoute = routeFile.replace(/\/route\.ts$/, "");
  const withoutSrcApp = withoutRoute.replace(/^src\/app/, "");
  return withoutSrcApp.replace(/\[([^\]]+)\]/g, "{$1}");
}

async function buildPaths(): Promise<ZodOpenApiPathsObject> {
  const routeFiles = await fg(ROUTES_GLOB, { cwd: ROOT });
  const paths: ZodOpenApiPathsObject = {};

  for (const file of routeFiles) {
    const mod = (await import(join(ROOT, file))) as Record<
      string,
      RouteHandler | undefined
    >;
    const path = toOpenApiPath(file);

    for (const method of HTTP_METHODS) {
      const handler = mod[method];
      const meta = handler?.__openapiMeta;
      if (!meta) continue;

      const httpMethod = method.toLowerCase() as Lowercase<HttpMethod>;
      paths[path] = {
        ...paths[path],
        [httpMethod]: {
          summary: meta.summary,
          tags: meta.tags,
          ...(meta.auth && { security: [{ bearerAuth: [] }] }),
          requestParams: {
            ...(meta.params && { path: meta.params }),
            ...(meta.query && { query: meta.query }),
          },
          ...(meta.body && {
            requestBody: {
              content: { "application/json": { schema: meta.body } },
            },
          }),
          responses: Object.fromEntries(
            Object.entries(meta.responses).map(
              ([status, { description, schema }]) => [
                status,
                { description, content: { "application/json": { schema } } },
              ],
            ),
          ),
        },
      };
    }
  }

  return paths;
}

async function main() {
  const paths = await buildPaths();

  const document = createDocument({
    openapi: "3.1.0",
    info: { title: "BandiNet API", version: "v1" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    paths,
  });

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(document, null, 2));
  console.log(
    `OpenAPI spec written to ${OUTPUT_PATH} (${Object.keys(paths).length} paths)`,
  );
}

main();
