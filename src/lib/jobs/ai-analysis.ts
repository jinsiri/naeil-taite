import { z } from "zod";

const CAREER_DIRECTIONS = [
  "DIRECT",
  "BRIDGE",
  "OPTION",
  "REPEAT",
  "DETOUR",
] as const;

const scoreSchema = z.number().int().min(0).max(100);
const evidenceSchema = z.strictObject({
  requirement: z.string().min(1).max(300),
  priority: z.enum(["필수", "우대", "기타"]),
  assessment: z.enum(["matched", "partial", "missing", "unknown"]),
  jobQuote: z.string().max(500),
  resumeQuote: z.string().max(500),
  reason: z.string().min(1).max(500),
});
const dimensionSchema = z.strictObject({
  score: scoreSchema,
  confidence: z.enum(["높음", "보통", "낮음"]),
  reason: z.string().min(1).max(500),
  jobQuote: z.string().max(500),
  resumeQuote: z.string().max(500),
});

export const jobAiAnalysisSchema = z.strictObject({
  summary: z.string().min(1).max(1000),
  roleIdentity: z.strictObject({
    role: z.string().min(1).max(300),
    focus: z.string().min(1).max(500),
    careerDirection: z.enum(CAREER_DIRECTIONS),
    careerDirectionReason: z.string().min(1).max(500),
  }),
  dimensions: z.strictObject({
    companyQuality: dimensionSchema,
    roleFit: dimensionSchema,
    careerCapital: dimensionSchema,
    targetAlignment: dimensionSchema,
    personalFit: dimensionSchema,
  }),
  passEstimate: scoreSchema,
  passEstimateCaveat: z.string().min(1).max(500),
  opportunityReason: z.string().min(1).max(1000),
  mainRisk: z.string().min(1).max(1000),
  requirements: z.array(evidenceSchema).max(25),
  companyResearch: z.strictObject({
    summary: z.string().min(1).max(1000),
    sources: z
      .array(
        z.strictObject({ title: z.string().min(1).max(300), url: z.url() }),
      )
      .max(10),
  }),
});

export type JobAiAnalysis = z.infer<typeof jobAiAnalysisSchema>;

const scoreJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    confidence: { type: "string", enum: ["높음", "보통", "낮음"] },
    reason: { type: "string" },
    jobQuote: { type: "string" },
    resumeQuote: { type: "string" },
  },
  required: ["score", "confidence", "reason", "jobQuote", "resumeQuote"],
} as const;

export const jobAiAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    roleIdentity: {
      type: "object",
      additionalProperties: false,
      properties: {
        role: { type: "string" },
        focus: { type: "string" },
        careerDirection: { type: "string", enum: [...CAREER_DIRECTIONS] },
        careerDirectionReason: { type: "string" },
      },
      required: ["role", "focus", "careerDirection", "careerDirectionReason"],
    },
    dimensions: {
      type: "object",
      additionalProperties: false,
      properties: {
        companyQuality: scoreJsonSchema,
        roleFit: scoreJsonSchema,
        careerCapital: scoreJsonSchema,
        targetAlignment: scoreJsonSchema,
        personalFit: scoreJsonSchema,
      },
      required: [
        "companyQuality",
        "roleFit",
        "careerCapital",
        "targetAlignment",
        "personalFit",
      ],
    },
    passEstimate: { type: "integer", minimum: 0, maximum: 100 },
    passEstimateCaveat: { type: "string" },
    opportunityReason: { type: "string" },
    mainRisk: { type: "string" },
    requirements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          requirement: { type: "string" },
          priority: { type: "string", enum: ["필수", "우대", "기타"] },
          assessment: {
            type: "string",
            enum: ["matched", "partial", "missing", "unknown"],
          },
          jobQuote: { type: "string" },
          resumeQuote: { type: "string" },
          reason: { type: "string" },
        },
        required: [
          "requirement",
          "priority",
          "assessment",
          "jobQuote",
          "resumeQuote",
          "reason",
        ],
      },
    },
    companyResearch: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        sources: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { title: { type: "string" }, url: { type: "string" } },
            required: ["title", "url"],
          },
        },
      },
      required: ["summary", "sources"],
    },
  },
  required: [
    "summary",
    "roleIdentity",
    "dimensions",
    "passEstimate",
    "passEstimateCaveat",
    "opportunityReason",
    "mainRisk",
    "requirements",
    "companyResearch",
  ],
} as const;
