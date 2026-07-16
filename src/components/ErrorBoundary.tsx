import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("==== Error Boundary Caught Error ====");
    console.error("Error:", error);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("====================================");

    // In production, you would send this to an error monitoring service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });

    // Store error in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
      localStorage.setItem('last_error', JSON.stringify(errorLog));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full glass-card border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
            
            <CardHeader className="text-center relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
                  <AlertTriangle className="w-10 h-10 text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
              </div>
              <CardTitle className="text-3xl font-black text-white tracking-tight">
                TelePost encountered an glitch
              </CardTitle>
              <CardDescription className="text-blue-100/60 font-medium text-lg mt-2">
                Don't worry, your data is safe. Let's get you back.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 relative z-10">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
                  <p className="text-xs font-mono text-destructive-foreground/70 mb-2 uppercase tracking-widest font-bold">
                    Developer Info:
                  </p>
                  <p className="text-sm font-mono text-red-400 mb-2 font-bold whitespace-pre-wrap">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-[10px] text-white/40 overflow-auto max-h-32 scrollbar-hide font-mono leading-relaxed">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                <Button
                  onClick={this.handleReset}
                  className="w-full h-14 rounded-2xl bg-white text-blue-950 hover:bg-blue-50 text-base font-black transition-all shadow-[0_8px_30px_rgb(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Return to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 text-base font-bold transition-all backdrop-blur"
                >
                  Reload Page
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-blue-100/30 font-medium">
                  If the issue persists, please contact support with the error details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
