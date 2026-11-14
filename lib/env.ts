import { z } from "zod";

const serverEnvSchema = z.object({
  FRAPPE_URL: z.string().url(),
  FRAPPE_API_KEY: z.string().min(1, "Generate one via the User profile > API Access."),
  FRAPPE_API_SECRET: z.string().min(1),
  // When set, session cookies re-issued by the Next.js login flow carry
  // this Domain attribute so they're shared across all subdomains under
  // it — enables SSO into sibling services like nao-<tenant>.<domain>.
  // Example: ".colossalhub.com" (leading dot is optional per RFC 6265).
  // Unset → cookies stay host-only (default Next.js behavior).
  COOKIE_DOMAIN: z.string().optional(),
  // Cloudflare Turnstile CAPTCHA. BOTH keys set → the login form shows
  // the widget and the server verifies its token. Either missing → the
  // CAPTCHA step is skipped entirely, so a deploy without keys can
  // never lock anyone out. Create keys at dash.cloudflare.com →
  // Turnstile (free), hostname app.colossalhub.com.
  TURNSTILE_SECRET_KEY: z.string().optional(),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_BRAND_NAME: z.string().default("Colossal Hub"),
  // Needed on the client to resolve Frappe-returned `/files/...` paths to
  // absolute URLs (e.g. the profile-image preview after upload).
  NEXT_PUBLIC_FRAPPE_URL: z.string().url().default("http://localhost:8000"),
  // Nao chat runtime embedded at /analytics/ask via iframe. Unset →
  // the page shows a "not configured" placeholder instead of an iframe.
  // Value must be the full origin (https://nao-...colossalhub.com/) so
  // the browser sends cookies scoped to .colossalhub.com along on the
  // iframe request without a redirect hop.
  NEXT_PUBLIC_NAO_EMBED_URL: z.string().url().optional(),
  // Turnstile site key (public pair of TURNSTILE_SECRET_KEY).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

let cachedServer: z.infer<typeof serverEnvSchema> | null = null;

export function serverEnv() {
  if (cachedServer) return cachedServer;
  const parsed = serverEnvSchema.safeParse({
    FRAPPE_URL: process.env.FRAPPE_URL,
    FRAPPE_API_KEY: process.env.FRAPPE_API_KEY,
    FRAPPE_API_SECRET: process.env.FRAPPE_API_SECRET,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
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
  NEXT_PUBLIC_NAO_EMBED_URL: process.env.NEXT_PUBLIC_NAO_EMBED_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
