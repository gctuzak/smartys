import { z } from "zod";

// Zod Schemas with Turkish Error Messages

export const activityTypeSchema = z.enum(
  ["TASK", "CALL", "MEETING", "EMAIL", "NOTE"]
);

export const activityPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const activityStatusSchema = z.enum(
  ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"]
);

export const createActivitySchema = z.object({
  type: activityTypeSchema,
  subject: z.string().min(1, { message: "Konu alanı zorunludur." }),
  description: z.string().optional(),
  priority: activityPrioritySchema.default("MEDIUM"),
  dueDate: z.union([z.string(), z.date()]).optional().transform((val) => (val ? new Date(val) : undefined)),
  assignedTo: z.string().uuid({ message: "Geçersiz kullanıcı ID." }),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  proposalId: z.string().uuid().optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.any().optional(), // JSONB
  reminders: z.any().optional(), // JSONB
  status: activityStatusSchema.optional().default("OPEN"),
});

export const updateActivityStatusSchema = z.object({
  id: z.string().uuid({ message: "Geçersiz aktivite ID." }),
  status: activityStatusSchema,
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
