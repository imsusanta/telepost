import { describe, expect, it } from "vitest";
import { callerOwnsPostAndChannel, classifyBearer, extractBearer, isInternalCaller } from "../../supabase/functions/_shared/auth.ts";

describe("scheduler and post authorization", () => {
  const serviceRoleKey = "service-role-secret-token";
  const cronSecret = "cron-shared-secret";

  it("rejects unauthenticated posting", () => {
    expect(classifyBearer({
      authorizationHeader: null,
      cronSecretHeader: null,
      cronSecret,
      serviceRoleKey,
    })).toBe("missing");
  });

  it("does not treat a user JWT as internal/global scheduler access", () => {
    expect(isInternalCaller({
      authorizationHeader: "Bearer user-jwt-token-value",
      cronSecretHeader: null,
      cronSecret,
      serviceRoleKey,
    })).toBe(false);
    expect(classifyBearer({
      authorizationHeader: "Bearer user-jwt-token-value",
      cronSecretHeader: null,
      cronSecret,
      serviceRoleKey,
    })).toBe("user-or-unknown");
  });

  it("accepts cron secret or service-role key as internal callers", () => {
    expect(classifyBearer({
      authorizationHeader: null,
      cronSecretHeader: cronSecret,
      cronSecret,
      serviceRoleKey,
    })).toBe("internal");
    expect(classifyBearer({
      authorizationHeader: `Bearer ${serviceRoleKey}`,
      cronSecretHeader: null,
      cronSecret,
      serviceRoleKey,
    })).toBe("internal");
  });

  it("rejects user A sending or modifying user B's post", () => {
    expect(callerOwnsPostAndChannel({
      callerUserId: "user-a",
      postUserId: "user-b",
      channelUserId: "user-b",
    })).toBe(false);
    expect(callerOwnsPostAndChannel({
      callerUserId: "user-a",
      postUserId: "user-a",
      channelUserId: "user-b",
    })).toBe(false);
  });

  it("allows the owner of both the post and channel", () => {
    expect(callerOwnsPostAndChannel({
      callerUserId: "user-a",
      postUserId: "user-a",
      channelUserId: "user-a",
    })).toBe(true);
  });

  it("allows an explicit super-admin role", () => {
    expect(callerOwnsPostAndChannel({
      callerUserId: "admin",
      postUserId: "user-b",
      channelUserId: "user-b",
      isSuperAdmin: true,
    })).toBe(true);
  });

  it("extracts bearer tokens without treating missing headers as empty secrets", () => {
    expect(extractBearer(null)).toBe("");
    expect(extractBearer("Bearer abc")).toBe("abc");
  });
});
