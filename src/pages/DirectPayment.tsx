import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useToast } from "@/hooks/use-toast";
import { DrutoLoader } from "@/components/DrutoLoader";
import { 
  CreditCard, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  Check, 
  ShieldCheck, 
  Sparkles,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import drutoLogo from "@/assets/druto-logo-gift.png";

const DirectPayment = () => {
  const { tier } = useParams<{ tier: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { initiateSubscription, isLoading: isPaymentLoading } = useStripeCheckout();
  const { toast } = useToast();
  const [status, setStatus] = useState<"checking" | "no-restaurant" | "error" | "landing">("checking");
  const [restaurant, setRestaurant] = useState<{id: string, name: string} | null>(null);
  const hasCheckedRef = useRef(false);

  const validTier = (tier?.toLowerCase() === "growth" || tier?.toLowerCase() === "pro") ? tier.toLowerCase() : "starter";
  
  const planDetails = {
    starter: { name: "Starter", price: 29, originalPrice: 39 },
    growth: { name: "Growth", price: 79, originalPrice: 99 },
    pro: { name: "Pro", price: 199, originalPrice: 249 }
  }[validTier as "starter" | "growth" | "pro"];

  useEffect(() => {
    const checkState = async () => {
      if (authLoading || hasCheckedRef.current) return;

      if (!user) {
        const returnPath = `/pay/${tier || "starter"}`;
        navigate(`/auth?type=owner&redirect=${encodeURIComponent(returnPath)}`);
        return;
      }

      hasCheckedRef.current = true;
      try {
        const { data: restaurant, error: fetchError } = await supabase
          .from("restaurants")
          .select("id, name")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!restaurant) {
          setStatus("no-restaurant");
          return;
        }

        setRestaurant(restaurant);
        setStatus("landing");
      } catch (error: any) {
        console.error("Direct payment check error:", error);
        setStatus("error");
      }
    };

    checkState();
  }, [user, authLoading, tier, navigate]);

  const handleProceedToPayment = async () => {
    if (!user || !restaurant) return;
    
    try {
      toast({
        title: "Opening Secure Checkout",
        description: `Preparing your ${planDetails.name} plan subscription...`,
      });

      await initiateSubscription(user.id, restaurant.id, { email: user.email }, validTier);
    } catch (error: any) {
      console.error("Payment trigger error:", error);
      toast({
        title: "Payment Error",
        description: "Could not open checkout. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (authLoading || (status === "checking" && user)) {
    return <DrutoLoader message="Preparing your secure checkout..." />;
  }

  if (status === "no-restaurant") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Set up your business first</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          To start a subscription, you first need to register your business on Druto.
        </p>
        <Button onClick={() => navigate("/onboarding/owner")} className="w-full max-w-xs h-12 rounded-xl">
          Start Onboarding
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <Button onClick={() => window.location.reload()} className="w-full max-w-xs h-12 rounded-xl">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* Premium Header */}
      <div className="px-6 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-primary/20 rounded-full blur-[80px]" />
        
        <div className="max-w-xl mx-auto flex flex-col gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/10"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={drutoLogo} alt="Druto" className="h-8 w-auto brightness-0 invert" />
          </div>
          
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight">Activate Global Plan</h1>
            <p className="text-slate-400 font-medium">Power up {restaurant?.name} with the {planDetails.name} plan.</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 -mt-10 space-y-6">
        {/* Pricing Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/20 text-white px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest">
            Annual Access
          </div>
          
          <div className="flex items-end gap-3 mb-8 pt-4">
            <div className="space-y-1">
              <p className="text-slate-500 line-through text-sm font-bold">${planDetails.originalPrice}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">${planDetails.price}</span>
                <span className="text-slate-500 text-sm font-medium">/ year</span>
              </div>
            </div>
            <div className="bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-xs font-bold mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Save ${planDetails.originalPrice - planDetails.price}
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-300 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <span>Global Loyalty Infrastructure</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-300 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <span>Secure International Checkout</span>
            </div>
          </div>

          <Button 
            onClick={handleProceedToPayment}
            disabled={isPaymentLoading}
            className="w-full h-18 rounded-2xl bg-white text-black font-black text-lg hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            {isPaymentLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                INITIATE SECURE CHECKOUT
              </>
            )}
          </Button>
          
          <p className="text-center text-[11px] text-slate-500 mt-6 font-medium">
            Payments processed securely via Stripe.
          </p>
        </div>

        {/* Global Benefits */}
        <div className="grid grid-cols-1 gap-4">
          {[
            { 
              icon: Globe, 
              title: "World-Class Reliability", 
              desc: "Deploy your loyalty program anywhere in the world with zero latency." 
            },
            { 
              icon: Sparkles, 
              title: "Premium Design", 
              desc: "A stunning customer experience that reflects your brand's excellence." 
            }
          ].map((benefit, i) => (
            <div key={i} className="flex gap-5 p-6 rounded-[2rem] bg-slate-900 border border-white/5">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <benefit.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-lg">{benefit.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-8">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            © 2024 Druto Worldwide
          </p>
        </div>
      </div>
    </div>
  );
};

export default DirectPayment;


