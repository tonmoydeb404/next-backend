// Repository classes live in @repo/db (framework-agnostic, reusable by any future consumer);
// this file just wires them to publicator's own Drizzle client singleton.
import { db } from "@/lib/api/database";
import {
  InternalRolesRepository,
  ProfilesRepository,
  ProvincesRepository,
  RegionsRepository,
  SeatsRepository,
} from "@repo/db";

export const regionsRepository = new RegionsRepository(db);
export const provincesRepository = new ProvincesRepository(db);
export const profilesRepository = new ProfilesRepository(db);
export const internalRolesRepository = new InternalRolesRepository(db);
export const seatsRepository = new SeatsRepository(db);
