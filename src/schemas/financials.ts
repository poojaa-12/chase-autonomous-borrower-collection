import { z } from "zod";

export const extractedFinancialsSchema = z.object({
  revenue: z.number().nonnegative().optional(),
  ebitda: z.number().optional(),
  netIncome: z.number().optional(),
  currency: z.string().default("USD"),
  periodEnd: z.string()
});

export type ExtractedFinancials = z.infer<typeof extractedFinancialsSchema>;
