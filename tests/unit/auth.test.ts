import { describe, expect, it } from "vitest";
import { callerOwnsChannel, callerOwnsPostAndChannel, classifyBearer, extractBearer, isInternalCaller, authorizeOwnedRecord, authorizeUserFacingAi } from "../../supabase/functions/_shared/auth.ts";

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
    expect(extractBearer("bearer xyz")).toBe("xyz");
  });

  it("does not treat the service-role key as a customer user", () => {
    expect(classifyBearer({
      authorizationHeader: `Bearer ${serviceRoleKey}`,
      cronSecretHeader: null,
      cronSecret,
      serviceRoleKey,
    })).toBe("internal");
    expect(authorizeUserFacingAi({
      classified: "internal",
      callerUserId: "00000000-0000-0000-0000-000000000000",
    })).toBe("unauthorized");
  });

  it("requires a verified user JWT for user-facing AI", () => {
    expect(authorizeUserFacingAi({ classified: "missing", callerUserId: null })).toBe("unauthorized");
    expect(authorizeUserFacingAi({ classified: "user-or-unknown", callerUserId: null })).toBe("unauthorized");
    expect(authorizeUserFacingAi({ classified: "user-or-unknown", callerUserId: "user-a" })).toBe("allow");
  });

  it("scopes document and channel access to the owner unless the caller is internal", () => {
    expect(authorizeOwnedRecord({
      classified: "user-or-unknown",
      callerUserId: "user-a",
      ownerUserId: "user-b",
      recordExists: true,
    })).toBe("forbidden");
    expect(authorizeOwnedRecord({
      classified: "user-or-unknown",
      callerUserId: "user-a",
      ownerUserId: "user-a",
      recordExists: true,
    })).toBe("allow-owner");
    expect(authorizeOwnedRecord({
      classified: "internal",
      callerUserId: null,
      ownerUserId: "user-b",
      recordExists: true,
    })).toBe("allow-internal");
    expect(authorizeOwnedRecord({
      classified: "user-or-unknown",
      callerUserId: "user-a",
      ownerUserId: "user-b",
      recordExists: false,
    })).toBe("not_found");
    expect(authorizeOwnedRecord({
      classified: "user-or-unknown",
      callerUserId: "user-a",
      ownerUserId: "user-b",
    })).toBe("forbidden");
    expect(callerOwnsChannel({
      callerUserId: "user-a",
      channelUserId: "user-b",
    })).toBe(false);
    expect(callerOwnsChannel({
      callerUserId: "user-a",
      channelUserId: "user-a",
    })).toBe(true);
  });
});
