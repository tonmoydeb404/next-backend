import { z } from "zod";

export const seatRoleSchema = z.enum(["owner", "operator", "viewer"]);
export type SeatRole = z.infer<typeof seatRoleSchema>;

export const seatSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  profileId: z.uuid().nullable(),
  seatRole: seatRoleSchema,
  createdAt: z.iso.datetime(),
});
export type Seat = z.infer<typeof seatSchema>;
