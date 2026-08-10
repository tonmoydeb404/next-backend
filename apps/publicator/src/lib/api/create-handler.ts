import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { handleError } from "./error-handler";
import { withAuth, type AuthSession } from "./with-auth";

type RouteContext = { params: Promise<Record<string, string>> };

type ParsedInput<
  TParams extends z.ZodTypeAny | undefined,
  TQuery extends z.ZodTypeAny | undefined,
  TBody extends z.ZodTypeAny | undefined,
> = {
  params: TParams extends z.ZodTypeAny
    ? z.infer<TParams>
    : Record<string, string>;
  query: TQuery extends z.ZodTypeAny
    ? z.infer<TQuery>
    : Record<string, string | undefined>;
  body: TBody extends z.ZodTypeAny ? z.infer<TBody> : undefined;
  req: NextRequest;
  session: AuthSession | null;
};

// Documents this route for the OpenAPI generator script (scripts/generate-openapi.ts) —
// no manual path registration needed, it's read straight off the exported handler.
type OpenApiMeta = {
  summary?: string;
  tags?: string[];
  responses: Record<string, { description: string; schema: z.ZodTypeAny }>;
};

type HandlerConfig<
  TParams extends z.ZodTypeAny | undefined = undefined,
  TQuery extends z.ZodTypeAny | undefined = undefined,
  TBody extends z.ZodTypeAny | undefined = undefined,
> = {
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  auth?: boolean;
  aal2?: boolean;
  openapi: OpenApiMeta;
  handler: (
    input: ParsedInput<TParams, TQuery, TBody>,
  ) => Promise<NextResponse>;
};

export type RouteHandler = ((
  req: NextRequest,
  ctx: RouteContext,
) => Promise<NextResponse>) & {
  __openapiMeta: OpenApiMeta & {
    params?: z.ZodTypeAny;
    query?: z.ZodTypeAny;
    body?: z.ZodTypeAny;
    auth?: boolean;
  };
};

export function createHandler<
  TParams extends z.ZodTypeAny | undefined = undefined,
  TQuery extends z.ZodTypeAny | undefined = undefined,
  TBody extends z.ZodTypeAny | undefined = undefined,
>(config: HandlerConfig<TParams, TQuery, TBody>) {
  const routeHandler = async (req: NextRequest, ctx: RouteContext) => {
    try {
      let session: AuthSession | null = null;

      if (config.auth) {
        const authResult = await withAuth(
          async (_req, _ctx, s) => {
            session = s;
            return NextResponse.next();
          },
          { requireAal2: config.aal2 },
        )(req, ctx);

        // If auth wrapper returned an error response, short-circuit
        if (authResult.status !== 200) return authResult;
      }

      const rawParams = await ctx.params;
      const params = config.params ? config.params.parse(rawParams) : rawParams;

      const url = new URL(req.url);
      const rawQuery = Object.fromEntries(url.searchParams.entries());
      const query = config.query ? config.query.parse(rawQuery) : rawQuery;

      const body = config.body
        ? config.body.parse(await req.json())
        : undefined;

      return await config.handler({
        params,
        query,
        body,
        req,
        session,
      } as ParsedInput<TParams, TQuery, TBody>);
    } catch (error) {
      return handleError(error);
    }
  };

  return Object.assign(routeHandler, {
    __openapiMeta: {
      ...config.openapi,
      params: config.params,
      query: config.query,
      body: config.body,
      auth: config.auth,
    },
  }) as RouteHandler;
}
