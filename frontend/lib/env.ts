import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().default("http://localhost:3000"),
  BACKEND_API_URL: z.string().optional(),
  NEXT_PUBLIC_BACKEND_API_URL: z.string().optional(),
  DEMO_USER_EMAIL: z.string().default("owner@example.com"),
  // Login credentials. AUTH_EMAILS is a comma-separated list of emails
  // that are allowed to sign in; they all share AUTH_PASSWORD. Defaults
  // ship with the current owner accounts — override via Vercel env vars
  // to rotate without a code change.
  AUTH_EMAILS: z.string().default("mayur.pokle@zeni.ai,marketing@zeni.ai"),
  AUTH_PASSWORD: z.string().default("Flowtest@123"),
  // Backwards-compat: an older AUTH_EMAIL var still works if set; it's
  // merged into the AUTH_EMAILS list at runtime.
  AUTH_EMAIL: z.string().optional()
});

export const env = envSchema.parse({
  APP_URL: process.env.APP_URL,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL,
  AUTH_EMAILS: process.env.AUTH_EMAILS,
  AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  AUTH_EMAIL: process.env.AUTH_EMAIL
});

export const allowedLoginEmails = Array.from(
  new Set(
    [...env.AUTH_EMAILS.split(","), env.AUTH_EMAIL ?? ""]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
);
