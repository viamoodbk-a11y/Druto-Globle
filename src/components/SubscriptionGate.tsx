import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Loader2, QrCode, Users, Gift, TrendingUp, AlertCircle, Clock, Sparkles, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SubscriptionBannerProps {
  restaurantId?: string;
  onSubscriptionSuccess?: () => void;
  trialDaysLeft?: number | null;
  isTrialing?: boolean;
}

interface SubscriptionGateProps {
  isSubscribed: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  restaurantId?: string;
  onSubscriptionSuccess?: () => void;
}

const features = [
  { icon: QrCode, label: "Unlimited QR scans" },
  { icon: Users, label: "Customer data & insights" },
  { icon: Gift, label: "Custom rewards" },
  { icon: TrendingUp, label: "Analytics dashboard" },
];

// Top banner component for subscription required (trial expired)
export const SubscriptionBanner = ({
  restaurantId,
  onSubscriptionSuccess,
}: SubscriptionBannerProps) => {
  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-5 border border-red-100 mb-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-destructive">
            Free Trial Ended
          </h3>
          <p className="text-sm text-destructive/80">
            Subscribe to keep your QR code active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <feature.icon className="h-5 w-5 text-destructive" />
            </div>
            <span className="text-sm text-muted-foreground">{feature.label}</span>
          </div>
        ))}
      </div>

      <Link to="/pricing">
        <Button
          variant="default"
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg"
        >
          <CreditCard className="h-4 w-4" />
          View Plans — from ₹999/year
        </Button>
      </Link>

      <p className="text-center text-xs text-muted-foreground mt-3">
        Plans from ₹999/year • Cancel anytime
      </p>
      <p className="text-center text-xs text-primary font-medium mt-2">
        🎁 Subscribe & get a FREE QR code stand delivered to you!
      </p>
    </div>
  );
};

// Trial countdown banner
export const TrialBanner = ({ trialDaysLeft }: { trialDaysLeft: number }) => {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800">
            🎉 Free Trial Active
          </h3>
          <p className="text-xs text-amber-700">
            {trialDaysLeft > 0
              ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining`
              : "Trial expires today"}
          </p>
        </div>
        <Link to="/pricing">
          <Button variant="outline" size="sm" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 h-8 text-[11px] font-bold">
            START SUBSCRIPTION
          </Button>
        </Link>
      </div>
    </div>
  );
};

// Blur overlay for QR section when not subscribed
export const QRBlurOverlay = ({
  restaurantId,
  onSubscriptionSuccess,
}: SubscriptionBannerProps) => {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-white/80 to-white/95 backdrop-blur-sm rounded-2xl">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <Gift className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Trial Ended — Subscribe Now
      </h3>
      <p className="text-sm text-muted-foreground text-center px-6 mb-1">
        Subscribe to activate your QR code and start collecting stamps!
      </p>
      <p className="text-xs text-primary font-medium text-center px-6 mb-4">
        🎁 Get a FREE QR code stand delivered to you!
      </p>
      <Link to="/pricing">
        <Button
          variant="default"
          size="lg"
          className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg"
        >
          <CreditCard className="h-4 w-4" />
          View Plans — from ₹999/yr
        </Button>
      </Link>
      <p className="text-xs text-muted-foreground mt-2">
        Plans from ₹999/year • Cancel anytime
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        or call us: <a href="tel:8446791696" className="text-destructive font-medium">8446791696</a>
      </p>
    </div>
  );
};

// Original SubscriptionGate for backward compatibility
export const SubscriptionGate = ({
  isSubscribed,
  isLoading,
  children,
  className,
  restaurantId,
  onSubscriptionSuccess,
}: SubscriptionGateProps) => {
  if (isLoading) {
    return <div className={cn("relative", className)}>{children}</div>;
  }

  if (isSubscribed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="blur-sm pointer-events-none">
        {children}
      </div>
      <QRBlurOverlay
        restaurantId={restaurantId}
        onSubscriptionSuccess={onSubscriptionSuccess}
      />
    </div>
  );
};
// Premium Subscription Popup for Conversion
export const SubscriptionPopup = ({
  open,
  onOpenChange,
  restaurantName,
  totalScans
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantName?: string;
  totalScans?: number;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl">
        <div className="relative">
          <div className="gradient-primary px-6 pt-10 pb-16 text-center text-white relative">
             <button 
               onClick={() => onOpenChange(false)}
               className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
             >
                <X className="h-4 w-4 text-white" />
             </button>
             <div className="absolute top-10 right-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center animate-pulse -z-0">
                <Sparkles className="h-6 w-6 text-white/50" />
             </div>
             <h2 className="text-2xl font-bold mb-2">Grow {restaurantName || "Your Business"}</h2>
             <p className="text-white/80 text-sm">
                You've already recorded <span className="font-bold underline">{totalScans || 0} scans</span>! 🚀
             </p>
          </div>

          <div className="px-6 -mt-8 pb-8">
            <div className="bg-card rounded-2xl p-5 shadow-xl border border-border space-y-4">
               <div className="flex flex-col gap-3">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <f.icon className="h-4 w-4 text-primary" />
                       </div>
                       <span className="text-[13px] font-medium text-foreground">{f.label}</span>
                    </div>
                  ))}
               </div>

               <div className="pt-4 border-t border-border">
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-2xl font-bold text-foreground">₹999</span>
                    <span className="text-muted-foreground text-sm">/ year</span>
                  </div>
                  <p className="text-[11px] text-center text-muted-foreground mb-4 font-medium uppercase tracking-wider">
                     Less than ₹3 per day
                  </p>

                  <Link to="/pricing">
                    <Button 
                      className="w-full h-12 rounded-full bg-primary text-white font-bold text-[15px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      onClick={() => onOpenChange(false)}
                    >
                      UNLIMIT MY GROWTH
                    </Button>
                  </Link>
                  
                  <p className="text-[10px] text-center text-primary font-bold mt-4 animate-bounce">
                    🎁 FREE QR Code Stand Delivered to your Doorstep!
                  </p>
               </div>
            </div>
            
            <button 
              className="w-full mt-6 text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Maybe later, show me my dashboard
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
// High-conversion Promotion Banner based on user screenshot
export const PromotionBanner = ({ 
  onPayClick 
}: { 
  onPayClick: () => void 
}) => {
  return (
    <div className="w-full bg-[#f0f7ff] rounded-3xl p-6 relative overflow-hidden group border border-blue-100/50">
      {/* Decorative dots in background like the screenshot */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-8 opacity-40">
         <div className="h-3 w-3 rounded-full bg-red-400" />
         <div className="h-2 w-2 rounded-full bg-blue-500 ml-4" />
         <div className="h-2 w-2 rounded-full bg-orange-400 -ml-2" />
      </div>

      <div className="max-w-[90%]">
        <h2 className="text-[22px] font-extrabold text-slate-900 leading-[1.2] mb-3">
          Upgrade Your Customer Experience & Boost Loyalty! 🚀
        </h2>
        
        <p className="text-[14px] text-slate-600 leading-[1.5] mb-6">
          Join Druto and start rewarding your best customers instantly. Subscribe now to get your account set up and receive your physical QR code kit in the mail.
        </p>

        <div className="inline-block bg-[#fffbeb] border border-amber-100 rounded-2xl px-6 py-4 shadow-sm mb-6">
           <p className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.1em] mb-1">
             SPECIAL ANNUAL SUBSCRIPTION
           </p>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">Just ₹999</span>
              <span className="text-lg font-bold text-slate-800">/ YEAR</span>
           </div>
        </div>

        <Button 
          onClick={onPayClick}
          className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <CreditCard className="h-5 w-5" />
          PAY NOW
        </Button>
      </div>
    </div>
  );
};

// New Dynamic Owner Popup for Admin-configured banners
export const DynamicOwnerPopup = ({
  open,
  onOpenChange,
  imageUrl,
  ctaLink,
  onCtaClick
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  ctaLink: string;
  onCtaClick?: () => void;
}) => {
  const navigate = useNavigate();

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      navigate(ctaLink);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl bg-white">
        <div className="relative">
          {/* Close button */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/30 transition-colors pointer-events-auto"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Banner Image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Promotion" 
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay for text readability if needed, though here we focus on the image */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          </div>

          {/* Content & CTA */}
          <div className="px-6 pb-8 -mt-6 relative z-10">
            <div className="bg-white rounded-2xl p-2 shadow-sm">
                <Button 
                    onClick={handleCta}
                    className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                    <CreditCard className="h-5 w-5 group-hover:animate-pulse" />
                    START SUBSCRIPTION
                </Button>
            </div>
            
            <button 
              className="w-full mt-6 text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Maybe later, take me to dashboard
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// High-conversion component with 3-hour countdown timer
export const TrialCountdownPromotion = ({ 
  onPayClick 
}: { 
  onPayClick: () => void 
}) => {
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number}>({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;
      const now = new Date().getTime();
      // Use a fixed epoch (e.g., start of Unix time) to ensure consistent 3-hour cycles
      const timeInCurrentCycle = now % THREE_HOURS_IN_MS;
      const msLeft = THREE_HOURS_IN_MS - timeInCurrentCycle;
      
      const h = Math.floor((msLeft / (1000 * 60 * 60)) % 24);
      const m = Math.floor((msLeft / (1000 * 60)) % 60);
      const s = Math.floor((msLeft / 1000) % 60);
      
      setTimeLeft({ h, m, s });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="w-full bg-gradient-to-br from-[#1a1c2c] to-[#4a192c] rounded-[32px] p-6 relative overflow-hidden shadow-2xl border border-white/10 mb-6">
      {/* Animated glow background */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 bg-orange-500/20 rounded-full blur-[80px]" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Timer className="h-4 w-4 text-orange-400 animate-pulse" />
            <span className="text-[12px] font-bold text-orange-400 uppercase tracking-wider">Flash Sale Ending In</span>
          </div>
          
          <div className="flex gap-1.5 order-last sm:order-none">
            {[timeLeft.h, timeLeft.m, timeLeft.s].map((unit, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="bg-white/10 backdrop-blur-md w-10 h-10 rounded-xl flex items-center justify-center border border-white/20">
                  <span className="text-white font-black text-lg">{formatNumber(unit)}</span>
                </div>
                {i < 2 && <span className="text-white/50 font-bold">:</span>}
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-2xl font-black text-white leading-tight mb-2">
          Special Offer Just For You! ⚡️
        </h3>
        <p className="text-white/70 text-sm mb-6 max-w-[90%]">
          Don't wait! Convert to a full subscriber now and unlock all premium features to grow your business.
        </p>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6 flex items-center justify-between gap-2">
          <div>
            <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Original Price</p>
            <p className="text-white/40 text-lg line-through font-bold">₹1199</p>
          </div>
          <div className="h-10 w-[1px] bg-white/10" />
          <div className="text-right">
            <p className="text-orange-400 text-[10px] uppercase font-black tracking-widest mb-1">Deal Price</p>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-3xl font-black">₹999</span>
              <span className="text-white/60 text-xs font-medium">/ year</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={onPayClick}
          className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-lg shadow-[0_8px_30px_rgb(249,115,22,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
        >
          <CreditCard className="h-5 w-5 group-hover:rotate-12 transition-transform" />
          SUBSCRIBE & SAVE ₹200
        </Button>
        
        <p className="text-center text-[11px] text-white/50 mt-4 font-medium flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-orange-400" />
          Includes FREE Physical QR Stand + Pro Support
        </p>
      </div>
    </div>
  );
};
