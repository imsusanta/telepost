import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Apple, 
  Chrome, 
  Share, 
  Plus,
  CheckCircle,
  Sparkles,
  Zap,
  Shield,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Lightning Fast", description: "Instant app loading with offline support" },
    { icon: Shield, title: "Secure", description: "HTTPS in transit and row-level security for your account data" },
    { icon: Sparkles, title: "AI Powered", description: "Smart quiz generation at your fingertips" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-hero-glow opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] animate-blob delay-200" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary via-accent to-secondary rounded-3xl flex items-center justify-center shadow-glow-lg mb-6">
              <Sparkles className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              <span className="text-gradient-primary">Install TelePost</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Get the full app experience with faster loading, offline access, and push notifications.
            </p>
          </div>

          {/* Installation Status */}
          {isInstalled ? (
            <div className="glass-card p-8 mb-8">
              <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Already Installed!</h2>
              <p className="text-muted-foreground mb-6">
                TelePost is ready to use. Open it from your home screen or app drawer.
              </p>
              <Link to="/dashboard">
                <Button size="lg" className="btn-primary-gradient rounded-full px-8">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Install Button (Android/Desktop) */}
              {deferredPrompt && (
                <div className="glass-card p-8 mb-8">
                  <Button 
                    onClick={handleInstall}
                    size="lg"
                    className="btn-primary-gradient rounded-full px-8 h-14 text-lg font-semibold shadow-glow-lg hover:shadow-glow-xl transition-all duration-500"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install Now
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    One-click install • No app store required
                  </p>
                </div>
              )}

              {/* Platform-specific Instructions */}
              <div className="glass-card p-8 mb-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center justify-center gap-2">
                  {platform === "ios" && <Apple className="w-5 h-5" />}
                  {platform === "android" && <Smartphone className="w-5 h-5" />}
                  {platform === "desktop" && <Monitor className="w-5 h-5" />}
                  How to Install
                </h2>

                {platform === "ios" && (
                  <div className="text-left space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Tap the Share button</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Share className="w-4 h-4" /> in Safari's toolbar at the bottom
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Scroll down and tap</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Plus className="w-4 h-4" /> "Add to Home Screen"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Tap "Add" to confirm</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          TelePost will appear on your home screen
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {platform === "android" && !deferredPrompt && (
                  <div className="text-left space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Tap the menu button</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Three dots ⋮ in Chrome's top right corner
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Select "Install app"</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Or "Add to Home screen"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {platform === "desktop" && !deferredPrompt && (
                  <div className="text-left space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Chrome className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Chrome / Edge</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Look for the install icon in the address bar, or check the menu for "Install TelePost"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Features */}
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            {features.map((feature, idx) => (
              <div key={idx} className="glass-card p-6 text-center card-hover">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Continue without installing */}
          <Link 
            to="/dashboard" 
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Continue in browser →
          </Link>
        </div>
      </div>
    </div>
  );
}
