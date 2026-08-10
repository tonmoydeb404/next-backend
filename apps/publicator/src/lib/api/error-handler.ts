import { formatErrorResponse } from "@repo/validators";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    logger.error({ issues: error.issues }, "Validation failed");
    return NextResponse.json(
      formatErrorResponse({
        statusCode: 400,
        message: "Validation failed",
        error: "Bad Request",
        details: error.issues,
      }),
      { status: 400 },
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      formatErrorResponse({
        statusCode: 404,
        message: error.message,
        error: "Not Found",
      }),
      { status: 404 },
    );
  }

  if (error instanceof Error) {
    logger.error({ err: error }, error.message);
  } else {
    logger.error({ err: error }, "Unknown error");
  }

  return NextResponse.json(
    formatErrorResponse({
      statusCode: 500,
      message: "Internal Server Error",
      error: "Internal Server Error",
    }),
    { status: 500 },
  );
}
