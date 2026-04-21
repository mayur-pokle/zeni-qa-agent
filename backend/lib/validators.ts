import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2),
  stagingUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  productionUrl: z.string().url(),
  monitoringActive: z.boolean().optional(),
  monitoringIntervalMinutes: z.number().int().min(30).max(1440).optional(),
  notifyOnCompletion: z.boolean().optional()
});

export const projectFiltersSchema = z.object({
  search: z.string().optional(),
  monitoring: z.enum(["all", "active", "inactive"]).optional(),
  issueState: z.enum(["all", "issues", "healthy"]).optional(),
  sort: z.enum(["lastRun", "createdAt"]).optional()
});

export const qaRunSchema = z.object({
  projectId: z.string().min(1),
  environment: z.enum(["STAGING", "PRODUCTION"]).optional()
});
