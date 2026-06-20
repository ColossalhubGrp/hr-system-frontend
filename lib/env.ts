import { z } from "zod";

const serverEnvSchema = z.object({
  FRAPPE_URL: z.string().url(),
  FRAPPE_API_KEY: z.string().min(1, "Generate one via the User profile > API Access."),
  FRAPPE_API_SECRET: z.string().min(1),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_BRAND_NAME: z.string().default("Colossal HR"),
  // Needed on the client to resolve Frappe-returned `/files/...` paths to
  // absolute URLs (e.g. the profile-image preview after upload).
  NEXT_PUBLIC_FRAPPE_URL: z.string().url().default("http://localhost:8000"),
});

let cachedServer: z.infer<typeof serverEnvSchema> | null = null;

export function serverEnv() {
  if (cachedServer) return cachedServer;
  const parsed = serverEnvSchema.safeParse({
    FRAPPE_URL: process.env.FRAPPE_URL,
    FRAPPE_API_KEY: process.env.FRAPPE_API_KEY,
    FRAPPE_API_SECRET: process.env.FRAPPE_API_SECRET,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment. Check .env.local:\n${issues}\nSee .env.example for the contract.`,
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
  NEXT_PUBLIC_FRAPPE_URL: process.env.NEXT_PUBLIC_FRAPPE_URL,
});
