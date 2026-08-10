import { createHandler } from "@/lib/api/create-handler";
import { db } from "@/lib/api/database";
import { sql } from "@repo/db";
import {
  formatResponse,
  healthCheckResponseSchema,
  type HealthCheckResponse,
} from "@repo/validators";
import { NextResponse } from "next/server";

export const GET = createHandler({
  openapi: {
    summary: "Health check",
    tags: ["Health"],
    responses: {
      200: {
        description: "Service healthy",
        schema: healthCheckResponseSchema,
      },
      503: {
        description: "Service unhealthy",
        schema: healthCheckResponseSchema,
      },
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
    const statusCode = status === "ok" ? 200 : 503;
    const database = {
      status: dbStatus,
      ...(dbMessage && { message: dbMessage }),
    };

    return NextResponse.json(
      formatResponse({
        statusCode,
        message: status === "ok" ? "Service healthy" : "Service unhealthy",
        results: { status, info: { database }, details: { database } },
        meta: {},
      }) satisfies HealthCheckResponse,
      { status: statusCode },
    );
  },
});
