import { envConfig } from "@/config/env.config";
import pino from "pino";

export const logger = pino({
  level: envConfig.LOGGING.LEVEL,
  ...(envConfig.ENV.DEV && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
