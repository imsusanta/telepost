import { secretsEqual } from "./crypto.ts";

export type SchedulerCaller =
  | { kind: "internal" }
  | { kind: "user"; userId: string }
  | { kind: "unauthenticated" };

export interface ResolveCallerInput {
  authorizationHeader: string | null;
  cronSecretHeader: string | null;
  cronSecret: string | null | undefined;
  serviceRoleKey: string | null | undefined;
}

/**
 * Classify the caller before any privileged work.
 *
 * Internal callers are the cron shared secret or the service-role key
 * (what pg_cron / internal dispatches send). A valid user JWT is never
 * treated as internal, even though both tokens are Bearer JWTs.
 */
export function classifyBearer(input: ResolveCallerInput): "internal" | "user-or-unknown" | "missing" {
  const cronOk = secretsEqual(input.cronSecretHeader, input.cronSecret ?? null);
  if (cronOk) return "internal";

  const bearer = extractBearer(input.authorizationHeader);
  if (!bearer) return "missing";
  if (secretsEqual(bearer, input.serviceRoleKey ?? null)) return "internal";
  return "user-or-unknown";
}

export function extractBearer(authorizationHeader: string | null | undefined): string {
  if (!authorizationHeader) return "";
  if (!authorizationHeader.startsWith("Bearer ")) return "";
  return authorizationHeader.slice(7).trim();
}

export function isInternalCaller(input: ResolveCallerInput): boolean {
  return classifyBearer(input) === "internal";
}

/**
 * Ownership: the caller must own the post and the associated channel,
 * unless they hold an explicit privileged role (super-admin).
 */
export function callerOwnsPostAndChannel(input: {
  callerUserId: string;
  postUserId: string | null | undefined;
  channelUserId: string | null | undefined;
  isSuperAdmin?: boolean;
}): boolean {
  if (input.isSuperAdmin) return true;
  if (!input.callerUserId || !input.postUserId) return false;
  if (input.callerUserId !== input.postUserId) return false;
  if (!input.channelUserId || input.callerUserId !== input.channelUserId) return false;
  return true;
}

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    const message = error.message;
    if (/token|secret|password|service.role|authorization/i.test(message)) {
      return fallback;
    }
    return message;
  }
  return fallback;
}
