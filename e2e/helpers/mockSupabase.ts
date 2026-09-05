import type { Page, Route } from "@playwright/test";

export const E2E_USER_ID = "11111111-1111-4111-8111-111111111111";
export const E2E_USER_EMAIL = "e2e@telepost.test";
export const E2E_USER_NAME = "E2E Teacher";

const SUPABASE_HOSTS = [
  "https://example.supabase.co/**",
  "https://wpkxbrdgktmwnowvmwue.supabase.co/**",
];

function encodeJwtSection(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function e2eAccessToken(): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    encodeJwtSection({ alg: "none", typ: "JWT" }),
    encodeJwtSection({
      aud: "authenticated",
      exp: now + 3600,
      iat: now,
      iss: "https://example.supabase.co/auth/v1",
      sub: E2E_USER_ID,
      email: E2E_USER_EMAIL,
      role: "authenticated",
    }),
    "e2e",
  ].join(".");
}

function e2eUser() {
  const now = new Date().toISOString();
  return {
    id: E2E_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: E2E_USER_EMAIL,
    email_confirmed_at: now,
    phone: "",
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: E2E_USER_NAME },
    identities: [],
    created_at: now,
    updated_at: now,
  };
}

function e2eSession() {
  const accessToken = e2eAccessToken();
  return {
    access_token: accessToken,
    refresh_token: "e2e-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: e2eUser(),
  };
}

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, prefer, range, accept, x-supabase-api-version",
  "access-control-allow-methods": "GET, HEAD, POST, OPTIONS, PATCH, DELETE",
  "access-control-expose-headers": "content-range, content-location, preference-applied",
};

function json(route: Route, body: unknown, extraHeaders: Record<string, string> = {}) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { ...corsHeaders, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

function countHead(route: Route, total: number) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: {
      ...corsHeaders,
      "content-range": `0-0/${total}`,
      "content-type": "application/json",
    },
    body: "",
  });
}

/**
 * Authenticated dashboard mock.
 *
 * Total Quizzes sums quiz_generations + scheduled_telegram_posts + telegram_posts.
 * The mock returns 233 scheduled rows and 0 elsewhere so the card cannot
 * regress to 0 when the generations table is empty.
 */
export async function mockSupabaseSession(page: Page): Promise<void> {
  const session = e2eSession();

  await page.addInitScript((value) => {
    window.localStorage.setItem("sb-example-auth-token", JSON.stringify(value));
    window.localStorage.setItem(
      "sb-wpkxbrdgktmwnowvmwue-auth-token",
      JSON.stringify(value),
    );
  }, session);

  for (const host of SUPABASE_HOSTS) {
    await page.route(host, async (route) => {
      const request = route.request();
      const url = request.url();
      const path = new URL(url).pathname;
      const method = request.method();
      const prefer = request.headers()["prefer"] ?? "";
      const isCount = method === "HEAD" || prefer.includes("count=");

      if (method === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
        return;
      }

      if (url.includes("/auth/v1/logout")) {
        await route.fulfill({ status: 204, body: "" });
        return;
      }

      if (url.includes("/auth/v1/user") || url.includes("/auth/v1/token")) {
        return json(route, url.includes("/auth/v1/token") ? session : e2eUser());
      }

      if (path.includes("/rest/v1/rpc/is_super_admin")) {
        return json(route, false);
      }

      if (path.includes("/rest/v1/profiles")) {
        return json(route, [
          {
            id: E2E_USER_ID,
            email: E2E_USER_EMAIL,
            full_name: E2E_USER_NAME,
            avatar_url: null,
            is_admin: false,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ]);
      }

      if (url.includes("scheduled_telegram_posts")) {
        const pending = new URL(url).searchParams.get("status")?.includes("pending");
        const total = pending ? 0 : 233;
        if (isCount) return countHead(route, total);
        return json(route, [], { "content-range": `0-0/${total}` });
      }

      if (isCount) return countHead(route, 0);
      return json(route, []);
    });
  }
}
