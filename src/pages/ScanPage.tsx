import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ProgressRing } from "@/components/ProgressRing";
import { Check, Gift, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanState = "loading" | "success" | "already_scanned" | "reward_earned" | "error";

const ScanPage = () => {
  const { restaurantId } = useParams();
  const [scanState, setScanState] = useState<ScanState>("loading");
  const [visitData, setVisitData] = useState({
    current: 0,
    total: 10,
    restaurantName: "Sunrise Café",
    rewardDescription: "Free coffee of your choice",
  });

  useEffect(() => {
    // Simulate scan processing
    const timer = setTimeout(() => {
      // Random state for demo purposes
      const states: ScanState[] = ["success", "already_scanned", "reward_earned"];
      const randomState = states[Math.floor(Math.random() * states.length)];
      
      setScanState(randomState);
      
      if (randomState === "success") {
        setVisitData((prev) => ({ ...prev, current: 7 }));
      } else if (randomState === "reward_earned") {
        setVisitData((prev) => ({ ...prev, current: 10 }));
      } else {
        setVisitData((prev) => ({ ...prev, current: 5 }));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [restaurantId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-md">
          {/* Loading State */}
          {scanState === "loading" && (
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-8">
                <ProgressRing current={0} total={100} size={160} strokeWidth={12} />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Processing your visit...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we record your visit
              </p>
            </div>
          )}

          {/* Success State */}
          {scanState === "success" && (
            <div className="text-center animate-slide-up">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-stamp">
                <Check className="h-10 w-10 text-primary" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Visit recorded! 🎉
              </h1>
              <p className="mb-8 text-muted-foreground">
                You're one step closer to your reward
              </p>

              <div className="mx-auto mb-8">
                <ProgressRing
                  current={visitData.current}
                  total={visitData.total}
                  size={160}
                  strokeWidth={12}
                />
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-card">
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  {visitData.restaurantName}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {visitData.rewardDescription}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-foreground">
                    {visitData.total - visitData.current} more visits to go!
                  </span>
                </div>
              </div>

              <Link to="/dashboard" className="mt-6 inline-block">
                <Button variant="hero" size="lg">
                  View All Rewards
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Already Scanned Today */}
          {scanState === "already_scanned" && (
            <div className="text-center animate-slide-up">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Already scanned today
              </h1>
              <p className="mb-8 text-muted-foreground">
                You can earn one visit per business per day. Come back tomorrow!
              </p>

              <div className="mx-auto mb-8">
                <ProgressRing
                  current={visitData.current}
                  total={visitData.total}
                  size={160}
                  strokeWidth={12}
                />
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-card">
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  {visitData.restaurantName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Current progress: {visitData.current} / {visitData.total} visits
                </p>
              </div>

              <Link to="/dashboard" className="mt-6 inline-block">
                <Button variant="outline" size="lg">
                  View All Rewards
                </Button>
              </Link>
            </div>
          )}

          {/* Reward Earned */}
          {scanState === "reward_earned" && (
            <div className="text-center animate-slide-up">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full gradient-primary animate-pulse-glow">
                <Gift className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">
                Congratulations! 🎉
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                You've earned a reward!
              </p>

              <div className="rounded-2xl gradient-primary p-6 text-center shadow-glow">
                <p className="mb-1 text-sm text-primary-foreground/80">
                  {visitData.restaurantName}
                </p>
                <h2 className="text-2xl font-bold text-primary-foreground">
                  {visitData.rewardDescription}
                </h2>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                Show this screen to the staff to redeem your reward
              </p>

              <Link to="/dashboard" className="mt-6 inline-block">
                <Button variant="hero-outline" size="lg">
                  View All Rewards
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Error State */}
          {scanState === "error" && (
            <div className="text-center animate-slide-up">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="mb-8 text-muted-foreground">
                We couldn't process your scan. Please try again.
              </p>

              <Button variant="hero" size="lg" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanPage;
