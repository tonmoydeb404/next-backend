import { envConfig } from "@/config/env.config";
import pino from "pino";
import pretty from "pino-pretty";

// pino-pretty is used as an in-process stream (not a worker `transport`) — a worker
// transport resolves the module by filesystem path at runtime, which breaks once
// Turbopack bundles this into a Vercel serverless function.
export const logger = pino(
  { level: envConfig.LOGGING.LEVEL },
  envConfig.ENV.DEV ? pretty({ colorize: true }) : undefined,
);
