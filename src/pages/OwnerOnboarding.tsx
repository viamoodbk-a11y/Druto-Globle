import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Store, Phone, User, ArrowRight, Loader2, SkipForward, Navigation, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import drutoLogo from "@/assets/druto-logo.png";
import { cn } from "@/lib/utils";

const ownerSchema = z.object({
  ownerName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

const businessSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(100),
  category: z.string().trim().min(1, "Category is required"),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  description: z.string().trim().max(500).optional(),
});

const OwnerOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"owner" | "business">("owner");
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Owner details
  const [ownerName, setOwnerName] = useState("");

  // Business details
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("other");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const authRaw = localStorage.getItem("druto_auth");
      if (!authRaw) return;
      const auth = JSON.parse(authRaw);
      const existingName = auth?.profile?.full_name?.trim();
      if (existingName) {
        setOwnerName(existingName);
        setStep("business");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast({
          title: "Location detected! 📍",
          description: "Your business coordinates have been saved.",
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Location error:", error);
        toast({
          title: "Location error",
          description: "Could not get your current location.",
          variant: "destructive"
        });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleOwnerSubmit = async () => {
    const result = ownerSchema.safeParse({ ownerName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) {
        navigate("/auth");
        return;
      }

      const parsedAuth = JSON.parse(authData);
      const userId = parsedAuth.userId || parsedAuth.user_id || parsedAuth.session?.user?.id || parsedAuth.user?.id;

      if (!userId) throw new Error("User ID is required");

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/update-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            userId,
            fullName: ownerName.trim(),
          }),
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const updatedAuth = {
        ...JSON.parse(authData),
        profile: { full_name: ownerName.trim() },
      };
      localStorage.setItem("druto_auth", JSON.stringify(updatedAuth));
      setStep("business");
    } catch (error: any) {
      console.error("Owner onboarding error:", error);
      toast({
        title: "Error saving profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessSubmit = async () => {
    const result = businessSchema.safeParse({ businessName, category, address, phone, description });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) {
        navigate("/auth");
        return;
      }

      const { userId } = JSON.parse(authData);

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/create-restaurant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            ownerId: userId,
            name: businessName.trim(),
            category,
            address: address.trim() || null,
            phone: phone.trim() || null,
            description: description.trim() || null,
            latitude,
            longitude,
          }),
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const updatedAuth = {
        ...JSON.parse(authData),
        onboardingComplete: true,
      };
      localStorage.setItem("druto_auth", JSON.stringify(updatedAuth));

      const postAuthRedirect = localStorage.getItem("druto_post_auth_redirect");
      if (postAuthRedirect) {
        localStorage.removeItem("druto_post_auth_redirect");
        navigate(postAuthRedirect);
      } else {
        navigate("/owner");
      }
    } catch (error: any) {
      console.error("Business onboarding error:", error);
      toast({
        title: "Error creating business",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBusiness = () => {
    const authData = localStorage.getItem("druto_auth");
    if (authData) {
      const updatedAuth = {
        ...JSON.parse(authData),
        onboardingComplete: true,
      };
      localStorage.setItem("druto_auth", JSON.stringify(updatedAuth));
    }

    const postAuthRedirect = localStorage.getItem("druto_post_auth_redirect");
    if (postAuthRedirect) {
      localStorage.removeItem("druto_post_auth_redirect");
      navigate(postAuthRedirect);
      return;
    }
    navigate("/owner");
  };

  const categories = [
    { value: "cafe", label: "☕ Café" },
    { value: "restaurant", label: "🍽️ Restaurant" },
    { value: "bakery", label: "🥐 Bakery" },
    { value: "bar", label: "🍺 Bar" },
    { value: "ice_cream", label: "🍦 Ice Cream" },
    { value: "salon", label: "💇 Salon & Spa" },
    { value: "gym", label: "🏋️ Gym & Fitness" },
    { value: "car_wash", label: "🚗 Car Wash" },
    { value: "jewelry", label: "💎 Jewelry" },
    { value: "pet_store", label: "🐾 Pet Store" },
    { value: "bookstore", label: "📚 Bookstore" },
    { value: "clothing", label: "👗 Clothing" },
    { value: "electronics", label: "📱 Electronics" },
    { value: "pharmacy", label: "💊 Pharmacy" },
    { value: "grocery", label: "🛒 Grocery" },
    { value: "retail", label: "🛍️ Retail" },
    { value: "other", label: "📦 Other" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-background dark:to-background flex flex-col">
      <div className="px-6 pt-8">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div className={cn("h-1 w-8 rounded-full transition-all", step === "business" ? "bg-primary" : "bg-muted")} />
          <div className="h-1 w-2 rounded-full bg-muted" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-8 text-left">
        <div className="w-full max-w-sm mx-auto">
          {step === "owner" ? (
            <>
              <div className="mb-10">
                <h1 className="text-3xl font-black text-foreground tracking-tight leading-tight mb-3">
                  Welcome abroad! 🏪
                </h1>
                <p className="text-muted-foreground font-medium">
                  Let's start with your full name
                </p>
              </div>

              {errors.ownerName && (
                <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                  <p className="text-sm text-destructive">{errors.ownerName}</p>
                </div>
              )}

              <div className="space-y-6 text-left">
                <div className="space-y-2">
                  <Label htmlFor="ownerName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Owner Name</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <User className="h-5 w-5" />
                    </span>
                    <Input
                      id="ownerName"
                      type="text"
                      placeholder="Enter your name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="h-14 text-lg pl-12 tracking-wide rounded-2xl bg-white border-border/50 focus:bg-background transition-colors shadow-sm"
                      maxLength={100}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-14 text-base rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={handleOwnerSubmit}
                  disabled={isLoading || ownerName.trim().length < 2}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-black text-foreground tracking-tight leading-tight mb-3">
                  Register Business 🚀
                </h1>
                <p className="text-muted-foreground font-medium">
                  Set up your business identity
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-12 rounded-xl bg-white border-border/50 shadow-sm"
                    maxLength={100}
                  />
                  {errors.businessName && (
                    <p className="text-sm text-destructive">{errors.businessName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-border/50 bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Address</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="address"
                      placeholder="Street, City, Country"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-12 rounded-xl bg-white border-border/50 shadow-sm"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleGetCurrentLocation}
                      disabled={isGettingLocation}
                      className="h-11 rounded-xl text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 gap-2 font-bold text-xs"
                    >
                      {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                      {latitude ? "Location Captured ✓" : "Capture GPS Coordinates"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 pl-10 rounded-xl bg-white border-border/50 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 rounded-xl border-dashed"
                    onClick={handleSkipBusiness}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    className="flex-1 h-12 rounded-xl font-bold shadow-lg"
                    onClick={handleBusinessSubmit}
                    disabled={isLoading || !businessName}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Done
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-full max-w-sm mx-auto mt-8">
          <div className="flex justify-center">
            <img src={drutoLogo} alt="Druto" className="h-8 w-auto opacity-30 invert dark:invert-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerOnboarding;
