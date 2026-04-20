import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Eye,
  EyeOff,
  Mail,
  Store,
  MapPin,
  CreditCard,
  Gift,
  CheckCircle2,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { BranchManagement } from "@/components/owner/BranchManagement";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsSection = "notifications" | "darkMode" | "privacy" | "support" | "subscription" | "locations" | null;

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);
  const [isSending, setIsSending] = useState(false);
  const { planTier, status, isLoading: isSubLoading, maxBranches, refetch: refetchSub } = useSubscription();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const getRestaurant = async () => {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
      const { userId } = JSON.parse(authData);

      const { data } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (data) setRestaurantId(data.id);
    };
    getRestaurant();
  }, []);

  // Handle URL params for direct navigation
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "notifications" || section === "privacy" || section === "support" || section === "subscription" || section === "locations") {
      setActiveSection(section);
    }
  }, [searchParams]);

  // Notification settings
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailEnabled: false,
    rewardAlerts: true,
    newPlaces: true,
    promotions: false,
  });

  // Dark mode (uses system or toggle)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    showProfile: true,
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
    // Success toast removed (keep UX quiet)
  };

  const handleSendSupport = async () => {
    if (!supportForm.name.trim() || !supportForm.email.trim() || !supportForm.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supportForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    try {
      // Create mailto link
      const subject = encodeURIComponent(supportForm.subject || "Support Request");
      const body = encodeURIComponent(
        `Name: ${supportForm.name}\nEmail: ${supportForm.email}\n\nMessage:\n${supportForm.message}`
      );

      window.location.href = `mailto:contact@druto.me?subject=${subject}&body=${body}`;

      // Success toast removed (keep UX quiet)
      setSupportForm({ name: "", email: "", subject: "", message: "" });
      setActiveSection(null);
    } catch (error) {
      toast.error("Failed to open email client");
    } finally {
      setIsSending(false);
    }
  };

  const saveNotificationSettings = () => {
    localStorage.setItem("druto_notifications", JSON.stringify(notifications));
    // Success toast removed (keep UX quiet)
    setActiveSection(null);
  };

  const savePrivacySettings = () => {
    localStorage.setItem("druto_privacy", JSON.stringify(privacy));
    // Success toast removed (keep UX quiet)
    setActiveSection(null);
  };

  const allMenuItems = [
    {
      id: "subscription" as const,
      icon: CreditCard,
      label: "Subscription",
      description: `Current plan: ${planTier?.toUpperCase() || "Starter"}`,
      ownerOnly: true,
    },
    {
      id: "locations" as const,
      icon: MapPin,
      label: "Business Locations",
      description: "Manage your store branches",
      ownerOnly: true,
    },
    {
      id: "notifications" as const,
      icon: Bell,
      label: "Notifications",
      description: "Manage push and email notifications",
      ownerOnly: false,
    },
    {
      id: "darkMode" as const,
      icon: Moon,
      label: "Dark Mode",
      description: "Toggle dark theme",
      toggle: true,
      value: isDarkMode,
      onToggle: handleDarkModeToggle,
      ownerOnly: false,
    },
    {
      id: "privacy" as const,
      icon: Shield,
      label: "Privacy & Security",
      description: "Control your data and privacy",
      ownerOnly: false,
    },
    {
      id: "support" as const,
      icon: HelpCircle,
      label: "Help & Support",
      description: "Get help or contact us",
      ownerOnly: false,
    },
  ];

  // Only show owner-specific items (Subscription, Locations) if user is a restaurant owner
  const menuItems = allMenuItems.filter(item => !item.ownerOnly || restaurantId);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => activeSection ? setActiveSection(null) : navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              {activeSection === "notifications" && "Notifications"}
              {activeSection === "darkMode" && "Appearance"}
              {activeSection === "privacy" && "Privacy & Security"}
              {activeSection === "support" && "Help & Support"}
              {activeSection === "subscription" && "Subscription"}
              {activeSection === "locations" && "Business Locations"}
              {!activeSection && "Settings"}
            </h1>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Main Menu */}
        {!activeSection && (
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            {menuItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => !item.toggle && setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left",
                  i < menuItems.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {item.toggle ? (
                  <Switch
                    checked={item.value}
                    onCheckedChange={item.onToggle}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-foreground">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
                </div>
                <Switch
                  checked={notifications.pushEnabled}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, pushEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Get updates via email</p>
                </div>
                <Switch
                  checked={notifications.emailEnabled}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-foreground">Reward Alerts</p>
                  <p className="text-sm text-muted-foreground">When you earn or can claim rewards</p>
                </div>
                <Switch
                  checked={notifications.rewardAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, rewardAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-foreground">New Places Nearby</p>
                  <p className="text-sm text-muted-foreground">Discover new restaurants</p>
                </div>
                <Switch
                  checked={notifications.newPlaces}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, newPlaces: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">Promotions</p>
                  <p className="text-sm text-muted-foreground">Special offers and deals</p>
                </div>
                <Switch
                  checked={notifications.promotions}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, promotions: checked })}
                />
              </div>
            </div>
            <Button onClick={saveNotificationSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        )}

        {/* Privacy Section */}
        {activeSection === "privacy" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-foreground">Share Location</p>
                  <p className="text-sm text-muted-foreground">For nearby places & QR verification</p>
                </div>
                <Switch
                  checked={privacy.shareLocation}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, shareLocation: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-foreground">Public Profile</p>
                  <p className="text-sm text-muted-foreground">Let others see your achievements</p>
                </div>
                <Switch
                  checked={privacy.showProfile}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, showProfile: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">Analytics</p>
                  <p className="text-sm text-muted-foreground">Help improve the app</p>
                </div>
                <Switch
                  checked={privacy.analyticsEnabled}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, analyticsEnabled: checked })}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="h-5 w-5 text-primary" />
                <p className="font-medium text-foreground">Data Protection</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted and securely stored. We never share your personal
                information with third parties without your consent.
              </p>
            </div>

            <Button onClick={savePrivacySettings} className="w-full">
              Save Settings
            </Button>
          </div>
        )}

        {/* Support Section */}
        {activeSection === "support" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Contact Support</p>
                  <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                    placeholder="Enter your name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    placeholder="you@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    placeholder="What's this about?"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    placeholder="Describe your issue or question..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleSendSupport}
                  className="w-full"
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to contact@druto.me
                </Button>
              </div>
            </div>

            <div className="rounded-2xl bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                You can also email us directly at{" "}
                <a href="mailto:contact@druto.me" className="text-primary font-medium">
                  contact@druto.me
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Subscription Section */}
        {activeSection === "subscription" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-xl font-bold text-foreground flex items-center gap-2">
                    {planTier?.toUpperCase() || "Starter"}
                    {status === "active" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-muted/30 p-4 border border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn(
                    "font-medium capitalize px-2 py-0.5 rounded-full text-xs",
                    status === "active" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {status || "No active plan"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Store Locations</span>
                  <span className="font-medium text-foreground">{maxBranches} locations</span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button onClick={() => navigate("/pricing")} className="w-full h-12 rounded-xl text-[15px]">
                  Upgrade or Change Plan
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Need custom features? Contact us at contact@druto.me
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <h3 className="font-bold text-foreground mb-3">Plan Features</h3>
              <ul className="space-y-2">
                {[
                  "Unlimited QR scans",
                  "Custom rewards & loyalty program",
                  "Detailed analytics dashboard",
                  `${maxBranches} Store locations support`,
                  "Priority support",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Locations Section */}
        {activeSection === "locations" && restaurantId && (
          <div className="space-y-4">
            <BranchManagement
              restaurantId={restaurantId}
              planTier={planTier}
              maxBranches={maxBranches}
            />
          </div>
        )}
        {activeSection === "locations" && !restaurantId && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No Restaurant Found</p>
              <p className="text-sm text-muted-foreground">Create your restaurant first to manage locations.</p>
            </div>
            <Button onClick={() => navigate("/owner")}>Go to Dashboard</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
