import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSubscription, PlanTier } from "@/hooks/useSubscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useOwnerData } from "@/hooks/useOwnerData";
import { BranchManagement } from "@/components/owner/BranchManagement";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Moon,
  Shield,
  HelpCircle,
  ChevronRight,
  Send,
  Loader2,
  Lock,
  Mail,
  CreditCard,
  MapPin,
} from "lucide-react";

type SettingsSection = "notifications" | "privacy" | "support" | "subscription" | "locations" | null;

interface SubscriptionDetails {
  status: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
}

const PLAN_PRICING: Record<PlanTier, { price: string; name: string }> = {
  starter: { price: "$29", name: "Starter" },
  growth: { price: "$79", name: "Growth" },
  pro: { price: "$199", name: "Professional" },
  enterprise: { price: "Custom", name: "Enterprise" },
};

const OwnerSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);
  const [isSending, setIsSending] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const {
    isActive: subscriptionActive,
    status: subscriptionStatus,
    isLoading: subscriptionLoading,
    isTrialing,
    trialDaysLeft,
    planTier,
    maxBranches,
  } = useSubscription();
  const { restaurant } = useOwnerData();
  const { initiateSubscription, isLoading: isCheckoutLoading } = useStripeCheckout();

  // Handle URL params for direct navigation
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "notifications" || section === "privacy" || section === "support" || section === "subscription" || section === "locations") {
      setActiveSection(section as SettingsSection);
    }
  }, [searchParams]);

  // Fetch subscription details when viewing subscription section
  useEffect(() => {
    const fetchDetails = async () => {
      if (activeSection !== "subscription") return;

      setIsLoadingDetails(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("subscriptions")
          .select("status, current_period_end, stripe_subscription_id")
          .eq("user_id", user.id)
          .order("status", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setSubscriptionDetails({
            status: data.status,
            currentPeriodEnd: data.current_period_end,
            stripeSubscriptionId: data.stripe_subscription_id,
          });
        }
      } catch (error) {
        console.error("Error fetching subscription details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [activeSection]);

  // Notification settings
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailEnabled: false,
    rewardAlerts: true,
    customerAlerts: true,
  });

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    analyticsEnabled: true,
  });

  // Support form
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSendSupport = async () => {
    if (!supportForm.name.trim() || !supportForm.email.trim() || !supportForm.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supportForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    try {
      const subject = encodeURIComponent(supportForm.subject || "Business Support Request");
      const body = encodeURIComponent(
        `Name: ${supportForm.name}\nEmail: ${supportForm.email}\n\nMessage:\n${supportForm.message}`
      );

      window.location.href = `mailto:contact@druto.in?subject=${subject}&body=${body}`;

      setSupportForm({ name: "", email: "", subject: "", message: "" });
      setActiveSection(null);
    } catch (error) {
      toast.error("Failed to open email client");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!restaurant) {
        toast.error("Please set up your restaurant first");
        return;
      }

      await initiateSubscription(user.id, restaurant.id, { email: user.email }, planTier || "starter");
    } catch (error) {
      console.error("Subscription error:", error);
    }
  };

  const saveNotificationSettings = () => {
    localStorage.setItem("druto_owner_notifications", JSON.stringify(notifications));
    setActiveSection(null);
  };

  const savePrivacySettings = () => {
    localStorage.setItem("druto_owner_privacy", JSON.stringify(privacy));
    setActiveSection(null);
  };

  const menuItems = [
    {
      id: "subscription" as const,
      icon: CreditCard,
      label: "Subscription",
      description: subscriptionActive ? "Active plan" : "Manage your plan",
      badge: subscriptionActive ? "Active" : "Inactive",
      badgeColor: subscriptionActive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
    },
    {
      id: "notifications" as const,
      icon: Bell,
      label: "Notifications",
      description: "Manage push and email notifications"
    },
    {
      id: "locations" as const,
      icon: MapPin,
      label: "Manage Locations",
      description: "Add or manage store branches"
    },
    {
      id: "darkMode" as const,
      icon: Moon,
      label: "Dark Mode",
      description: "Toggle dark theme",
      toggle: true,
      value: isDarkMode,
      onToggle: handleDarkModeToggle
    },
    {
      id: "privacy" as const,
      icon: Shield,
      label: "Privacy & Security",
      description: "Control your data and privacy"
    },
    {
      id: "support" as const,
      icon: HelpCircle,
      label: "Help & Support",
      description: "Get help or contact us"
    },
  ].filter(item => !(item as any).hide);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      {/* Header - Gradient Style */}
      <div className="bg-[#0A0A0A] rounded-b-[32px] px-5 pb-8 pt-12 border-b border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10"
            onClick={() => navigate("/owner/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">
            {activeSection === "subscription" && "Subscription"}
            {activeSection === "notifications" && "Notifications"}
            {activeSection === "locations" && "Manage Locations"}
            {activeSection === "privacy" && "Privacy & Security"}
            {activeSection === "support" && "Help & Support"}
            {!activeSection && "Settings"}
          </h1>
        </div>
        <p className="text-white/50 text-[13px] pl-12">
          {activeSection === "subscription" && "Manage your subscription plan"}
          {activeSection === "notifications" && "Control your alerts"}
          {activeSection === "locations" && "Add or manage store branches"}
          {activeSection === "privacy" && "Your data & security"}
          {activeSection === "support" && "Get help from our team"}
          {!activeSection && "Manage preferences"}
        </p>
      </div>

      <div className="px-4 py-5 -mt-4 relative z-10">
        {!activeSection && (
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            {menuItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => !item.toggle && setActiveSection(item.id as SettingsSection)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left",
                  i < menuItems.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{item.label}</p>
                    {item.badge && (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", item.badgeColor)}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {item.toggle ? (
                  <Switch
                    checked={item.value}
                    onCheckedChange={item.onToggle}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Subscription Section */}
        {activeSection === "subscription" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Current Plan</h2>
                <span className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-full",
                  subscriptionStatus === "Admin Access"
                    ? "bg-purple-500/10 text-purple-600 border border-purple-200"
                    : subscriptionActive
                      ? "bg-green-500/10 text-green-600 border border-green-200"
                      : "bg-red-500/10 text-red-600 border border-red-200"
                )}>
                  {subscriptionStatus || "No Plan"}
                </span>
              </div>

              {isLoadingDetails || subscriptionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : subscriptionActive ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          Druto {PLAN_PRICING[planTier]?.name || "Plan"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {PLAN_PRICING[planTier]?.price}/yr
                        </p>
                      </div>
                    </div>
                  </div>

                  {subscriptionDetails?.currentPeriodEnd && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next billing date</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(subscriptionDetails.currentPeriodEnd), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      Need help? Contact{" "}
                      <a href="mailto:contact@druto.in" className="text-primary">contact@druto.in</a>
                    </p>
                    <Link to="/pricing" className="block w-full">
                      <Button variant="outline" className="w-full">
                        Upgrade or Change Plan
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : isTrialing ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 text-center border border-green-200 dark:from-green-950/20 dark:to-emerald-950/20">
                    <p className="text-sm text-green-700 font-medium mb-1">🎉 Free Trial Active</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-400">
                      {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
                    </p>
                    <p className="text-xs text-green-600 mt-1">Your QR code is active during the trial</p>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">After trial ends</p>
                    <p className="text-xl font-bold text-foreground">{PLAN_PRICING.starter.price}<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-foreground">
                      <span className="text-green-500">✓</span> Unlimited customer scans
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <span className="text-green-500">✓</span> Custom rewards program
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <span className="text-green-500">✓</span> Analytics dashboard
                    </li>
                    <li className="flex items-center gap-2 text-primary font-medium">
                      <span className="text-primary">🌍</span> Global loyalty infrastructure
                    </li>
                  </ul>
                  <Button onClick={handleSubscribe} className="w-full h-12 rounded-xl font-bold shadow-lg" disabled={isCheckoutLoading}>
                    {isCheckoutLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Subscribe Now for ${PLAN_PRICING.starter.price}/yr`}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-muted-foreground mb-2">
                      Subscribe to unlock QR scanning for your customers
                    </p>
                    <p className="text-2xl font-bold text-foreground">from {PLAN_PRICING.starter.price}<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                  </div>

                  <Link to="/pricing">
                    <Button variant="hero" className="w-full h-12 rounded-xl text-base font-bold shadow-lg">
                      View Global Plans
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
                  </div>
                  <Switch
                    checked={notifications.pushEnabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, pushEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Weekly analytics and reports</p>
                  </div>
                  <Switch
                    checked={notifications.emailEnabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailEnabled: checked })}
                  />
                </div>
              </div>
              <Button onClick={saveNotificationSettings} className="w-full h-12 rounded-xl font-bold">Save Preferences</Button>
            </div>
          </div>
        )}

        {/* Privacy Section */}
        {activeSection === "privacy" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Share Location</Label>
                    <p className="text-sm text-muted-foreground">Help customers find your store</p>
                  </div>
                  <Switch
                    checked={privacy.shareLocation}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, shareLocation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5" title="Google Analytics & Mixpanel">
                    <Label className="text-base">Usage Analytics</Label>
                    <p className="text-sm text-muted-foreground">Share anonymous usage data</p>
                  </div>
                  <Switch
                    checked={privacy.analyticsEnabled}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, analyticsEnabled: checked })}
                  />
                </div>
              </div>
              <Button onClick={savePrivacySettings} className="w-full h-12 rounded-xl font-bold">Update Privacy</Button>
            </div>
          </div>
        )}

        {/* Support Section */}
        {activeSection === "support" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-5">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={supportForm.name}
                  onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={supportForm.email}
                  onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                  placeholder="john@example.com"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                  placeholder="I have a question about my plan"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Describe your issue or request..."
                  className="min-h-[120px] rounded-xl"
                />
              </div>
              <Button onClick={handleSendSupport} className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90" disabled={isSending}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Message
              </Button>
            </div>
          </div>
        )}

        {/* Locations Section */}
        {activeSection === "locations" && restaurant && (
          <div className="space-y-4">
            <BranchManagement
              restaurantId={restaurant.id}
              planTier={planTier}
              maxBranches={maxBranches}
            />
          </div>
        )}
      </div>

      <OwnerBottomNav />
    </div>
  );
};

export default OwnerSettings;

