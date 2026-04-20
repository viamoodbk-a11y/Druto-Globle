import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Building2,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import drutoLogo from "@/assets/druto-logo-gift.png";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialCountdownPromotion } from "@/components/SubscriptionGate";

interface PlanInfo {
  tier: "starter" | "growth" | "pro";
  name: string;
  price: number;
  originalPrice?: number;
  branches: number;
  popular?: boolean;
  features: string[];
}

const plans: PlanInfo[] = [
  {
    tier: "starter",
    name: "Starter",
    price: 29,
    originalPrice: 39,
    branches: 1,
    features: [
      "1 store location",
      "Unlimited QR scans",
      "Custom rewards",
      "Analytics dashboard",
      "Global loyalty system",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    price: 79,
    originalPrice: 99,
    branches: 3,
    popular: true,
    features: [
      "Up to 3 store locations",
      "Same QR, GPS branch detection",
      "Branch-wise scan analytics",
      "All Starter features",
      "Priority support",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: 199,
    originalPrice: 249,
    branches: 6,
    features: [
      "Up to 6 store locations",
      "Same QR, GPS branch detection",
      "Branch-wise scan analytics",
      "All Growth features",
      "Dedicated account manager",
    ],
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiateSubscription, isLoading: isPaymentLoading } = useStripeCheckout();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const { isTrialing, isLoading: subscriptionLoading } = useSubscription();

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      navigate("/auth?type=owner");
      return;
    }

    setLoadingTier(tier);
    try {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!restaurant) {
        toast({ title: "Please set up your business first", variant: "destructive" });
        setLoadingTier(null);
        return;
      }

      await initiateSubscription(user.id, restaurant.id, { email: user.email }, tier);
    } catch (error) {
      console.error("Subscription error:", error);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="px-5 pb-10 pt-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-10 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={drutoLogo} alt="Druto" className="h-8 w-auto brightness-0 invert" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 relative z-10 tracking-tight">
          Global Pricing
        </h1>
        <p className="text-slate-400 text-lg max-w-sm mx-auto relative z-10">
          Scale your loyalty program across the world seamlessly
        </p>
      </div>

      {/* Plans */}
      <div className="px-4 pb-12 relative z-10">
        {!subscriptionLoading && isTrialing && (
          <div className="max-w-4xl mx-auto mb-8">
            <TrialCountdownPromotion onPayClick={() => {
              const element = document.getElementById("starter-plan");
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }} />
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              id={plan.tier === 'starter' ? 'starter-plan' : undefined}
              className={cn(
                "relative rounded-[2rem] bg-slate-900/40 backdrop-blur-xl border-2 p-8 transition-all duration-500 hover:scale-[1.02]",
                plan.popular
                  ? "border-primary shadow-[0_0_40px_rgba(235,68,50,0.1)]"
                  : "border-white/5"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] uppercase tracking-widest font-black px-6 py-2 rounded-full shadow-lg">
                  Recommended
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">${plan.price}</span>
                  <span className="text-slate-500 font-medium">/ year</span>
                </div>
                {plan.originalPrice && (
                  <p className="text-slate-500 line-through text-sm mt-1">Was ${plan.originalPrice}</p>
                )}
              </div>

              <div className="h-px w-full bg-white/5 mb-8" />

              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <MapPin className="h-4 w-4 text-primary" />
                  {plan.branches === 1 ? "Single Location" : `Up to ${plan.branches} Locations`}
                </li>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-400">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className={cn(
                  "w-full h-14 rounded-2xl text-base font-bold transition-all",
                  !plan.popular && "bg-transparent border-white/10 text-white hover:bg-white hover:text-black"
                )}
                onClick={() => handleSubscribe(plan.tier)}
                disabled={loadingTier !== null}
              >
                {loadingTier === plan.tier ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Get Started"
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="max-w-xl mx-auto mt-12">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
            
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4">Enterprise Solutions</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              For global brands requiring custom features, unlimited scale, and dedicated 24/7 support teams.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild className="h-12 px-8 rounded-xl bg-white text-black font-bold hover:bg-slate-200 w-full sm:w-auto">
                <a href="mailto:contact@druto.me">Contact Sales</a>
              </Button>
              <Button variant="ghost" className="h-12 px-8 rounded-xl text-white font-semibold hover:bg-white/5 w-full sm:w-auto">
                View Documentation
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-12 bg-white/5 inline-block py-2 px-6 rounded-full left-1/2 -translate-x-1/2 relative">
          ✨ Free 3-day trial on all plans. No credit card required.
        </p>
      </div>
    </div>
  );
};

export default Pricing;