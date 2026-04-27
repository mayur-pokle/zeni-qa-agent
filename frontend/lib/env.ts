import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().default("http://localhost:3000"),
  BACKEND_API_URL: z.string().optional(),
  NEXT_PUBLIC_BACKEND_API_URL: z.string().optional(),
  DEMO_USER_EMAIL: z.string().default("owner@example.com"),
  // Login credentials. Defaults match the production owner; override
  // via Vercel env vars to rotate without a code change.
  AUTH_EMAIL: z.string().default("mayur.pokle@zeni.ai"),
  AUTH_PASSWORD: z.string().default("Flowtest@123")
});

export const env = envSchema.parse({
  APP_URL: process.env.APP_URL,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL,
  AUTH_EMAIL: process.env.AUTH_EMAIL,
  AUTH_PASSWORD: process.env.AUTH_PASSWORD
});
