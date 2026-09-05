import { type Page } from "@playwright/test";

export const E2E_USER_ID = "11111111-1111-4111-8111-111111111111";
export const E2E_USER_EMAIL = "e2e@telepost.test";
export const E2E_USER_NAME = "E2E Teacher";

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

export async function mockSupabaseSession(page: Page): Promise<void> {
  const session = e2eSession();

  await page.addInitScript(
    ({ storageKey, sessionJson }) => {
      window.localStorage.setItem(storageKey, sessionJson);
    },
    {
      storageKey: "sb-example-auth-token",
      sessionJson: JSON.stringify(session),
    },
  );

  await page.route("https://example.supabase.co/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (url.includes("/auth/v1/logout")) {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (url.includes("/auth/v1/user") || url.includes("/auth/v1/token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("/auth/v1/token") ? session : e2eUser()),
      });
      return;
    }

    if (url.includes("/rest/v1/rpc/is_super_admin")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "false" });
      return;
    }

    if (url.includes("/rest/v1/profiles")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: E2E_USER_ID,
            email: E2E_USER_EMAIL,
            full_name: E2E_USER_NAME,
            avatar_url: null,
          },
        ]),
      });
      return;
    }

    const empty = method === "HEAD" || request.headers()["prefer"]?.includes("count=");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": "0-0/0",
        "prefer-control": "count=exact",
      },
      body: empty ? "" : "[]",
    });
  });
}
