import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("==== Error Boundary Caught Error ====");
    console.error("Error:", error);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("====================================");

    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
      localStorage.setItem("last_error", JSON.stringify(errorLog));
    } catch (storageError) {
      console.error("Failed to persist error details:", storageError);
    }
  }

  private getErrorDetails = (): string => {
    const error = this.state.error;
    if (!error) return "No error details available.";

    return [
      `URL: ${window.location.href}`,
      `Message: ${error.message || "Unknown error"}`,
      `Name: ${error.name || "Error"}`,
      `Stack: ${error.stack || "Unavailable"}`,
    ].join("\n");
  };

  private handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(this.getErrorDetails());
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (error) {
      console.error("Failed to copy error details:", error);
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Unknown runtime error";

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full glass-card border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />

            <CardHeader className="text-center relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
                  <AlertTriangle className="w-10 h-10 text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
              </div>
              <CardTitle className="text-3xl font-black text-white tracking-tight">
                TelePost encountered a glitch
              </CardTitle>
              <CardDescription className="text-blue-100/60 font-medium text-lg mt-2">
                Your data is safe. We captured the error details to help fix it.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 relative z-10">
              <div className="rounded-2xl border border-red-400/20 bg-red-950/30 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-red-300/80 mb-2">
                  Runtime error
                </p>
                <p className="text-sm font-mono text-red-200 whitespace-pre-wrap break-words">
                  {errorMessage}
                </p>
              </div>

              {this.state.error?.stack && (
                <details className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-white/70">
                    Technical details
                  </summary>
                  <pre className="mt-3 text-[10px] text-white/50 overflow-auto max-h-48 font-mono leading-relaxed whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 h-12 rounded-xl bg-white text-blue-950 hover:bg-blue-50 font-bold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleCopyError}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {this.state.copied ? "Copied" : "Copy Error Details"}
                </Button>
              </div>

              <p className="text-center text-xs text-blue-100/40">
                Error details are also saved locally as <code>last_error</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
