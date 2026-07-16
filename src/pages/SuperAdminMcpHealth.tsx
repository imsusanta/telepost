import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

const AUTO_REFRESH_MS = 60_000;

type Status = "pending" | "pass" | "fail";
interface Check {
  id: string;
  name: string;
  description: string;
  status: Status;
  detail?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const MCP_URL = `${SUPABASE_URL}/functions/v1/mcp`;
const RESOURCE_META_URL = `${MCP_URL}/.well-known/oauth-protected-resource`;
const ISSUER = `https://${PROJECT_REF}.supabase.co/auth/v1`;
const CONSENT_URL = `${window.location.origin}/.lovable/oauth/consent?authorization_id=healthcheck`;

const initialChecks: Check[] = [
  { id: "resource", name: "Protected resource metadata", description: "GET /functions/v1/mcp/.well-known/oauth-protected-resource returns 200 with the correct issuer.", status: "pending" },
  { id: "challenge", name: "401 bearer challenge", description: "POST /functions/v1/mcp with no auth returns 401 with WWW-Authenticate: Bearer.", status: "pending" },
  { id: "discovery", name: "OAuth server discovery", description: "Issuer publishes /.well-known/oauth-authorization-server with authorize/token/registration endpoints.", status: "pending" },
  { id: "dcr", name: "Dynamic client registration", description: "Discovery advertises a registration_endpoint so MCP clients can self-register.", status: "pending" },
  { id: "consent", name: "OAuth consent route", description: "GET /.lovable/oauth/consent serves the app (SPA fallback).", status: "pending" },
];

export default function SuperAdminMcpHealth() {
  const [checks, setChecks] = useState<Check[]>(initialChecks);
  const [running, setRunning] = useState(false);

  const set = (id: string, patch: Partial<Check>) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [lastAuthChallengeAt, setLastAuthChallengeAt] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setChecks(initialChecks);
    setLastRunAt(new Date());

    // 1. Resource metadata
    try {
      const res = await fetch(RESOURCE_META_URL);
      const body = await res.json();
      const issuerMatch = Array.isArray(body.authorization_servers) && body.authorization_servers[0] === ISSUER;
      set("resource", {
        status: res.ok && issuerMatch ? "pass" : "fail",
        detail: `HTTP ${res.status} · authorization_servers[0]=${body.authorization_servers?.[0] ?? "—"}`,
      });
    } catch (e) {
      set("resource", { status: "fail", detail: (e as Error).message });
    }

    // 2. 401 challenge
    try {
      const res = await fetch(MCP_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      const www = res.headers.get("www-authenticate") ?? "";
      const ok = res.status === 401 && /Bearer/i.test(www) && /resource_metadata/i.test(www);
      set("challenge", {
        status: ok ? "pass" : "fail",
        detail: `HTTP ${res.status} · WWW-Authenticate: ${www || "(missing)"}`,
      });
      setLastAuthChallengeAt(new Date());
    } catch (e) {
      set("challenge", { status: "fail", detail: (e as Error).message });
    }

    // 3 + 4. Discovery + DCR
    try {
      const res = await fetch(`${ISSUER}/.well-known/oauth-authorization-server`);
      const body = await res.json();
      const discoveryOk = res.ok && body.issuer === ISSUER && !!body.authorization_endpoint && !!body.token_endpoint;
      set("discovery", {
        status: discoveryOk ? "pass" : "fail",
        detail: `issuer=${body.issuer ?? "—"} · authorize=${!!body.authorization_endpoint} · token=${!!body.token_endpoint}`,
      });
      set("dcr", {
        status: body.registration_endpoint ? "pass" : "fail",
        detail: body.registration_endpoint ?? "registration_endpoint missing",
      });
    } catch (e) {
      set("discovery", { status: "fail", detail: (e as Error).message });
      set("dcr", { status: "fail", detail: "discovery failed" });
    }

    // 5. Consent route
    try {
      const res = await fetch(CONSENT_URL, { redirect: "manual" });
      // SPA fallback returns 200 with index.html; any 2xx/3xx is acceptable, 404 = broken route
      const ok = res.status !== 404;
      set("consent", {
        status: ok ? "pass" : "fail",
        detail: `HTTP ${res.status} · ${CONSENT_URL}`,
      });
    } catch (e) {
      set("consent", { status: "fail", detail: (e as Error).message });
    }

    setRunning(false);
  }, []);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextIn, setNextIn] = useState(AUTO_REFRESH_MS / 1000);
  const runRef = useRef(run);
  useEffect(() => { runRef.current = run; }, [run]);

  useEffect(() => { run(); }, [run]);

  useEffect(() => {
    if (!autoRefresh) return;
    setNextIn(AUTO_REFRESH_MS / 1000);
    const tick = setInterval(() => {
      setNextIn((n) => (n <= 1 ? AUTO_REFRESH_MS / 1000 : n - 1));
    }, 1000);
    const runner = setInterval(() => { runRef.current(); }, AUTO_REFRESH_MS);
    return () => { clearInterval(tick); clearInterval(runner); };
  }, [autoRefresh]);

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const pending = checks.filter((c) => c.status === "pending").length;
  const errors = checks.filter((c) => c.status === "fail");
  const challengeCheck = checks.find((c) => c.id === "challenge");
  const overall: "healthy" | "degraded" | "down" | "checking" =
    pending > 0 ? "checking" : failed === 0 ? "healthy" : challengeCheck?.status === "fail" ? "down" : "degraded";
  const overallMeta = {
    healthy: { label: "Operational", cls: "text-green-600 border-green-600/40 bg-green-600/5", Icon: ShieldCheck },
    degraded: { label: "Degraded", cls: "text-amber-600 border-amber-600/40 bg-amber-600/5", Icon: AlertTriangle },
    down: { label: "Auth failing", cls: "text-red-600 border-red-600/40 bg-red-600/5", Icon: ShieldAlert },
    checking: { label: "Checking…", cls: "text-muted-foreground border-border bg-muted/30", Icon: Loader2 },
  }[overall];
  const fmt = (d: Date | null) => (d ? d.toLocaleTimeString() : "—");

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Health Check</h1>
          <p className="text-muted-foreground mt-1">
            Verifies the OAuth consent route and the <code>/functions/v1/mcp</code> 401 challenge that external clients
            (ChatGPT, Claude, Cursor) rely on.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="cursor-pointer text-sm">
              Auto-refresh {autoRefresh && <span className="text-muted-foreground">({nextIn}s)</span>}
            </Label>
          </div>
          <Button onClick={run} disabled={running} variant="outline">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Re-run
          </Button>
        </div>
      </div>

      <Card className={`border-2 ${overallMeta.cls}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <overallMeta.Icon className={`h-6 w-6 mt-0.5 ${overall === "checking" ? "animate-spin" : ""}`} />
            <div className="flex-1">
              <CardTitle className="text-lg">MCP connection status: {overallMeta.label}</CardTitle>
              <CardDescription className="mt-1">
                {overall === "healthy" && "All checks passing. External MCP clients can complete OAuth and reach tools."}
                {overall === "degraded" && `${failed} check${failed === 1 ? "" : "s"} failing. Connections may still work but are not fully verified.`}
                {overall === "down" && "The 401 bearer challenge is failing — MCP clients cannot initiate OAuth."}
                {overall === "checking" && "Running diagnostics…"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><div className="text-muted-foreground">Passed</div><div className="text-lg font-semibold text-green-600">{passed}</div></div>
          <div><div className="text-muted-foreground">Failed</div><div className={`text-lg font-semibold ${failed ? "text-red-600" : ""}`}>{failed}</div></div>
          <div><div className="text-muted-foreground">Last check</div><div className="text-sm font-medium">{fmt(lastRunAt)}</div></div>
          <div><div className="text-muted-foreground">Last auth attempt</div><div className="text-sm font-medium">{fmt(lastAuthChallengeAt)}</div></div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-red-600/30 bg-red-600/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm">Error details ({errors.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {errors.map((e) => (
              <div key={e.id} className="text-xs">
                <div className="font-medium text-red-600">{e.name}</div>
                <pre className="mt-1 bg-background/60 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">{e.detail ?? "(no detail)"}</pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {checks.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {c.status === "pending" && <Loader2 className="h-5 w-5 mt-0.5 animate-spin text-muted-foreground" />}
                {c.status === "pass" && <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600" />}
                {c.status === "fail" && <XCircle className="h-5 w-5 mt-0.5 text-red-600" />}
                <div className="flex-1">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription className="mt-1">{c.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            {c.detail && (
              <CardContent className="pt-0">
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{c.detail}</pre>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Endpoints</CardTitle></CardHeader>
        <CardContent className="text-xs font-mono space-y-1 text-muted-foreground">
          <div>MCP server: {MCP_URL}</div>
          <div>Issuer: {ISSUER}</div>
          <div>Consent: {window.location.origin}/.lovable/oauth/consent</div>
        </CardContent>
      </Card>
    </div>
  );
}
