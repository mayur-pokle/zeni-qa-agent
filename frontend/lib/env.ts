import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().default("http://localhost:3000"),
  BACKEND_API_URL: z.string().optional(),
  NEXT_PUBLIC_BACKEND_API_URL: z.string().optional(),
  DEMO_USER_EMAIL: z.string().default("owner@example.com"),
  // Login credentials. AUTH_USERS is a comma-separated list of
  // `email:password` pairs (one per user). Defaults ship with the
  // current owner accounts — override via Vercel env vars to rotate
  // without a code change.
  //
  // Backwards-compat: AUTH_EMAILS (comma-separated emails sharing one
  // AUTH_PASSWORD) and the older single AUTH_EMAIL still work if
  // AUTH_USERS isn't set.
  AUTH_USERS: z
    .string()
    .default(
      "mayur.pokle@zeni.ai:Flowtest@123,marketing@zeni.ai:Marketing@123"
    ),
  AUTH_EMAILS: z.string().optional(),
  AUTH_PASSWORD: z.string().optional(),
  AUTH_EMAIL: z.string().optional()
});

export const env = envSchema.parse({
  APP_URL: process.env.APP_URL,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL,
  AUTH_USERS: process.env.AUTH_USERS,
  AUTH_EMAILS: process.env.AUTH_EMAILS,
  AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  AUTH_EMAIL: process.env.AUTH_EMAIL
});

/**
 * Map of allowed login email → password. Built by merging AUTH_USERS
 * with the legacy AUTH_EMAILS+AUTH_PASSWORD variables so an older
 * deploy's env config still works.
 */
export const loginCredentials: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  // Primary: AUTH_USERS = "email:password,email:password"
  for (const entry of env.AUTH_USERS.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const email = trimmed.slice(0, idx).trim().toLowerCase();
    const password = trimmed.slice(idx + 1);
    if (email && password) map[email] = password;
  }
  // Legacy fallback: AUTH_EMAILS=a,b,c sharing AUTH_PASSWORD
  if (env.AUTH_EMAILS && env.AUTH_PASSWORD) {
    for (const e of env.AUTH_EMAILS.split(",")) {
      const email = e.trim().toLowerCase();
      if (email && !map[email]) map[email] = env.AUTH_PASSWORD;
    }
  }
  // Even older fallback: single AUTH_EMAIL+AUTH_PASSWORD
  if (env.AUTH_EMAIL && env.AUTH_PASSWORD) {
    const email = env.AUTH_EMAIL.trim().toLowerCase();
    if (email && !map[email]) map[email] = env.AUTH_PASSWORD;
  }
  return map;
})();
