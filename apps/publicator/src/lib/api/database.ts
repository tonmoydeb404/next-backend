import { envConfig } from "@/config/env.config";
import { createDb, type Database } from "@repo/db";

export const db: Database = createDb(envConfig.DATABASE.URL);
