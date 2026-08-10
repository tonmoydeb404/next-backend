import { createHandler } from "@/lib/api/create-handler";
import { db } from "@/lib/api/database";
import { sql } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  info: z.object({
    database: z.object({ status: z.string(), message: z.string().optional() }),
  }),
  details: z.object({
    database: z.object({ status: z.string(), message: z.string().optional() }),
  }),
});

export const GET = createHandler({
  openapi: {
    summary: "Health check",
    tags: ["Health"],
    responses: {
      200: { description: "Service healthy", schema: healthResponseSchema },
      503: { description: "Service unhealthy", schema: healthResponseSchema },
    },
  },
  handler: async () => {
    let dbStatus = "up";
    let dbMessage: string | undefined;

    try {
      await db.execute(sql`select 1`);
    } catch (error) {
      dbStatus = "down";
      dbMessage = error instanceof Error ? error.message : "Unknown error";
    }

    const status = dbStatus === "up" ? "ok" : "error";

    return NextResponse.json(
      {
        status,
        info: {
          database: {
            status: dbStatus,
            ...(dbMessage && { message: dbMessage }),
          },
        },
        details: {
          database: {
            status: dbStatus,
            ...(dbMessage && { message: dbMessage }),
          },
        },
      },
      { status: status === "ok" ? 200 : 503 },
    );
  },
});
