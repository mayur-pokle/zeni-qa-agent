import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/qa_monitor?schema=public"),
  UPTIMEROBOT_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().default("465"),
  SMTP_SECURE: z.string().default("true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  ALERT_EMAIL: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),
  BACKEND_API_URL: z.string().optional(),
  NEXT_PUBLIC_BACKEND_API_URL: z.string().optional(),
  MONITOR_CRON_SECRET: z.string().default("change-me"),
  DEMO_USER_EMAIL: z.string().default("owner@example.com")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/qa_monitor?schema=public",
  UPTIMEROBOT_API_KEY: process.env.UPTIMEROBOT_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  ALERT_EMAIL: process.env.ALERT_EMAIL,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  APP_URL: process.env.APP_URL,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  MONITOR_CRON_SECRET: process.env.MONITOR_CRON_SECRET,
  DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL,
  RESEND_FROM: process.env.RESEND_FROM
});
