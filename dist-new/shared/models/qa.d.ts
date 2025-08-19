import { z } from 'zod';
export declare const QAEntrySchema: z.ZodObject<{
    id: z.ZodString;
    question: z.ZodString;
    answer: z.ZodString;
    lang: z.ZodOptional<z.ZodString>;
    vars: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodEnum<["approved", "pending"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    answer: string;
    question: string;
    status?: "approved" | "pending" | undefined;
    lang?: string | undefined;
    vars?: string[] | undefined;
}, {
    id: string;
    answer: string;
    question: string;
    status?: "approved" | "pending" | undefined;
    lang?: string | undefined;
    vars?: string[] | undefined;
}>;
export type QAEntry = z.infer<typeof QAEntrySchema>;
//# sourceMappingURL=qa.d.ts.map