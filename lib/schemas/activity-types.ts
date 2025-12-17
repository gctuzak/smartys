import { z } from "zod";

export const createActivityTypeSchema = z.object({
  name: z.string().min(1, "Kod adı zorunludur (örn: TASK)"),
  label: z.string().min(1, "Görünecek isim zorunludur"),
  color: z.string().optional().default("#3b82f6"),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateActivityTypeSchema = createActivityTypeSchema.extend({
  id: z.string().uuid(),
});

export type CreateActivityTypeInput = z.infer<typeof createActivityTypeSchema>;
export type UpdateActivityTypeInput = z.infer<typeof updateActivityTypeSchema>;
