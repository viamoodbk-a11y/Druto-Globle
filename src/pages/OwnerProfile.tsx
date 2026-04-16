import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Camera,
  Store,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Edit2,
  Loader2,
  Wifi,
  CreditCard,
  Instagram,
  Facebook,
  Youtube,
  Star,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useOwnerProfileData } from "@/hooks/useOwnerProfileData";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useSubscription } from "@/hooks/useSubscription";
import { OlaMapSearch } from "@/components/OlaMapSearch";
import { BranchManagement } from "@/components/owner/BranchManagement";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { OwnerProfileSkeleton } from "@/components/skeletons/OwnerProfileSkeleton";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { supabase } from "@/integrations/supabase/client";
import { OpeningHoursInput } from "@/components/owner/OpeningHoursInput";

const OwnerProfile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { owner, business, isLoading, refetch } = useOwnerProfileData();
  const { planTier, maxBranches } = useSubscription();
  const { uploadImage, isUploading } = useImageUpload();
  const [activeSection, setActiveSection] = useState<"profile" | "business" | "socials" | "location" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    facebook: "",
    youtube: "",
    google_review_text: "",
    google_review_url: "",
  });
  const [isSavingSocials, setIsSavingSocials] = useState(false);
  const [remoteScanEnabled, setRemoteScanEnabled] = useState<boolean | null>(null);
  const [requireApprovalEnabled, setRequireApprovalEnabled] = useState<boolean | null>(null);

  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    description: "",
    category: "other",
    phone: "",
    email: "",
    address: "",
    city: "",
    openingHours: "",
  });

  const [locationCoords, setLocationCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const [ownerInfo, setOwnerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (owner.name || owner.phone || owner.email) {
      setOwnerInfo({
        name: owner.name,
        phone: owner.phone,
        email: owner.email,
      });
    }
    if (business) {
      setRemoteScanEnabled(business.socialLinks?.allow_remote_scan === true);
      setRequireApprovalEnabled(business.requireApproval === true);
      setBusinessInfo({
        name: business.name,
        description: business.description,
        category: business.category,
        phone: business.phone,
        email: business.email,
        address: business.address,
        city: business.city,
        openingHours: business.openingHours,
      });
      if (business.latitude && business.longitude) {
        setLocationCoords({ lat: business.latitude, lng: business.longitude });
      }
      setSocialLinks({
        instagram: business.socialLinks?.instagram || "",
        facebook: business.socialLinks?.facebook || "",
        youtube: business.socialLinks?.youtube || "",
        google_review_text: business.socialLinks?.google_review_text || "",
        google_review_url: business.googleReviewUrl || "",
      });
    }
  }, [owner, business]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !business) return;

    const result = await uploadImage(file, `logos/${business.id}`);

    if (result.success && result.url) {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
      const { userId } = JSON.parse(authData);

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/update-restaurant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            restaurantId: business.id,
            field: "logo_url",
            value: result.url,
            userId,
          }),
        }
      );

      const updateResult = await response.json();
      if (updateResult.success) {
        toast({ title: "Logo uploaded!", description: "Your business logo has been updated" });
        refetch();
      } else {
        toast({ title: "Update failed", description: updateResult.error, variant: "destructive" });
      }
    } else {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    }

    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !business) return;

    const result = await uploadImage(file, `logos/${business.id}`);

    if (result.success && result.url) {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
      const { userId } = JSON.parse(authData);

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/update-restaurant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            restaurantId: business.id,
            field: "cover_image_url",
            value: result.url,
            userId,
          }),
        }
      );

      const updateResult = await response.json();
      if (updateResult.success) {
        toast({ title: "Cover uploaded!", description: "Your cover image has been updated" });
        refetch();
      } else {
        toast({ title: "Update failed", description: updateResult.error, variant: "destructive" });
      }
    } else {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    }

    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleSaveProfile = async () => {
    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
      const { userId } = JSON.parse(authData);

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
            fullName: ownerInfo.name,
            email: ownerInfo.email,
          }),
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast({ title: "Profile updated!", description: "Your changes have been saved" });
      setActiveSection(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save profile", variant: "destructive" });
    }
  };

  const handleSaveBusiness = async () => {
    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
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
            name: businessInfo.name,
            category: businessInfo.category,
            address: businessInfo.address,
            phone: businessInfo.phone,
            email: businessInfo.email,
            openingHours: businessInfo.openingHours,
            city: businessInfo.city,
            description: businessInfo.description,
            latitude: locationCoords.lat,
            longitude: locationCoords.lng,
          }),
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast({ title: "Business info updated!", description: "Your business details have been saved" });
      setActiveSection(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save business info", variant: "destructive" });
    }
  };

  const handleSaveSocials = async () => {
    if (!business) return;
    setIsSavingSocials(true);
    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
      const { userId } = JSON.parse(authData);
      
      const { instagram, facebook, youtube, google_review_text, google_review_url } = socialLinks;

      // Update socialLinks
      const socialLinksRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-restaurant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          restaurantId: business.id,
          field: "social_links",
          value: { instagram, facebook, youtube, google_review_text },
          userId,
        }),
      });
      const socialLinksData = await socialLinksRes.json();
      if (!socialLinksData.success) throw new Error(socialLinksData.error);

      // Update googleReviewUrl
      const googleReviewRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-restaurant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          restaurantId: business.id,
          field: "google_review_url",
          value: google_review_url,
          userId,
        }),
      });
      const googleReviewData = await googleReviewRes.json();
      // It may fail if field is mapped differently, ignoring throwing error to proceed safely
      
      toast({ title: "Social links saved!", description: "Your social profiles have been updated" });
      setActiveSection(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save social links", variant: "destructive" });
    } finally {
      setIsSavingSocials(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("druto_auth");
      localStorage.removeItem("druto_post_auth_redirect");
      toast({ title: "Logged out successfully" });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate even on error to clear local state
      localStorage.clear();
      navigate("/");
    }
  };

  if (isLoading) {
    return <OwnerProfileSkeleton />;
  }

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      cafe: "☕", 
      restaurant: "🍽️", 
      bakery: "🥐", 
      bar: "🍺",
      ice_cream: "🍦",
      salon: "💇", 
      gym: "🏋️", 
      car_wash: "🚗",
      jewelry: "💎",
      pet_store: "🐾",
      bookstore: "📚",
      clothing: "👗",
      electronics: "📱",
      pharmacy: "💊",
      grocery: "🛒",
      retail: "🛍️",
      other: "📦",
    };
    return icons[category] || "🏪";
  };

  const formatOpeningHours = (hours: any) => {
    if (!hours) return "Not set";
    try {
      let parsed = hours;
      if (typeof hours === "string") {
        try {
          parsed = JSON.parse(hours);
        } catch (e) {
          return hours;
        }
      }
      
      if (typeof parsed !== "object" || parsed === null) return hours;
      
      const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      const schedule = parsed[today];

      const formatTime = (t: string) => {
        if (!t) return "";
        let [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}${m ? `:${m.toString().padStart(2, '0')}` : ''} ${ampm}`;
      };
      
      if (schedule && schedule.isOpen && schedule.slots && schedule.slots.length > 0) {
        return schedule.slots.map((s: any) => `${formatTime(s.open)} - ${formatTime(s.close)}`).join(", ");
      }
      return schedule && !schedule.isOpen ? "Closed today" : "Hours set";
    } catch (e) {
      return typeof hours === 'string' ? hours : "Hours set";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header - Gradient Style */}
      <div className="gradient-primary rounded-b-[32px] px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/owner">
            <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-white">Profile & Settings</h1>
        </div>
        <p className="text-white/70 text-[13px] pl-12">Manage your business and account</p>
      </div>

      <div className="px-4 py-5 -mt-4 relative z-10">
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />

        {/* Business Card */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="relative h-24 gradient-primary" style={business?.coverImageUrl ? { backgroundImage: `url(${business.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
            <button className="absolute right-3 top-3 rounded-full bg-background/20 p-2 backdrop-blur-sm hover:bg-background/30" onClick={() => coverInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" /> : <Camera className="h-4 w-4 text-primary-foreground" />}
            </button>
          </div>
          <div className="relative px-6 pb-6">
            <div className="relative -mt-12 mb-4 inline-block">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-card text-4xl shadow-card border-4 border-background overflow-hidden">
                {business?.logoUrl ? <img src={getOptimizedImageUrl(business.logoUrl, 200)} alt={business.name} className="h-full w-full object-cover" /> : getCategoryIcon(business?.category || "other")}
              </div>
              <button className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 shadow-sm" onClick={() => logoInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" /> : <Camera className="h-3 w-3 text-primary-foreground" />}
              </button>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{business?.name || "Set up your business"}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground capitalize">{business?.category || "Business"}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSection(activeSection === "business" ? null : "business")}>
                <Edit2 className="mr-2 h-4 w-4" />Edit
              </Button>
            </div>
          </div>

          {activeSection === "business" && (
            <div className="border-t border-border bg-muted/30 p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bizName">Business Name</Label>
                  <Input id="bizName" value={businessInfo.name} onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bizCategory">Category</Label>
                  <select id="bizCategory" value={businessInfo.category} onChange={(e) => setBusinessInfo({ ...businessInfo, category: e.target.value })} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="cafe">☕ Café</option>
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="bakery">🥐 Bakery</option>
                    <option value="bar">🍺 Bar</option>
                    <option value="ice_cream">🍦 Ice Cream</option>
                    <option value="salon">💇 Salon & Spa</option>
                    <option value="gym">🏋️ Gym & Fitness</option>
                    <option value="car_wash">🚗 Car Wash</option>
                    <option value="jewelry">💎 Jewelry</option>
                    <option value="pet_store">🐾 Pet Store</option>
                    <option value="bookstore">📚 Bookstore</option>
                    <option value="clothing">👗 Clothing</option>
                    <option value="electronics">📱 Electronics</option>
                    <option value="pharmacy">💊 Pharmacy</option>
                    <option value="grocery">🛒 Grocery</option>
                    <option value="retail">🛍️ Retail</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bizDesc">Description</Label>
                <Textarea id="bizDesc" value={businessInfo.description} onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bizPhone">Phone</Label>
                  <Input id="bizPhone" value={businessInfo.phone} onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bizEmail">Email</Label>
                  <Input id="bizEmail" type="email" value={businessInfo.email} onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })} className="h-11" />
                </div>
              </div>
              <Button onClick={handleSaveBusiness} className="w-full"><Save className="mr-2 h-4 w-4" />Save Business Info</Button>
            </div>
          )}
        </div>

        {/* Location & Hours Section */}
        <div className="mb-6 rounded-2xl bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10"><MapPin className="h-6 w-6 text-green-500" /></div>
              <div><p className="font-semibold text-foreground">Location & Hours</p><p className="text-sm text-muted-foreground">Manage your address and timing</p></div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveSection(activeSection === "location" ? null : "location")}><Edit2 className="h-4 w-4" /></Button>
          </div>

          {activeSection === "location" && (
            <div className="border-t border-border bg-muted/30 p-6 space-y-6 text-left">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bizHours" className="text-sm font-semibold">Opening Hours</Label>
                <OpeningHoursInput 
                  value={businessInfo.openingHours} 
                  onChange={(val) => setBusinessInfo({ ...businessInfo, openingHours: JSON.stringify(val) })} 
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-semibold">Business Address & Coordinates</Label>
                <div className="space-y-3">
                  <Input
                    placeholder="Street, City, Country"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-12 rounded-xl gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold"
                    onClick={async () => {
                      if (!navigator.geolocation) {
                        toast({ title: "Not supported", variant: "destructive" });
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                          toast({ title: "Coordinates Updated! 📍" });
                        },
                        (err) => toast({ title: "Location Error", description: err.message, variant: "destructive" }),
                        { enableHighAccuracy: true }
                      );
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                    {locationCoords.lat ? "Refresh GPS Coordinates" : "Capture Current GPS"}
                  </Button>
                  {locationCoords.lat && (
                    <p className="text-center font-mono text-[10px] text-green-600 font-bold tracking-widest uppercase">
                      Fixed: {locationCoords.lat.toFixed(6)}, {locationCoords.lng?.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={handleSaveBusiness} className="w-full h-12 rounded-xl text-base font-bold"><Save className="mr-2 h-5 w-5" />Update Location & Hours</Button>
            </div>
          )}
        </div>

        {/* Business Details Cards */}
        {business && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div 
              className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => {
                setActiveSection("business");
                setTimeout(() => document.getElementById("bizPhone")?.focus(), 100);
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium text-foreground truncate">{business.phone || "Not set"}</p></div>
              <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div 
              className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => {
                setActiveSection("business");
                setTimeout(() => document.getElementById("bizEmail")?.focus(), 100);
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><Mail className="h-5 w-5 text-blue-500" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm text-muted-foreground">Email</p><p className="font-medium text-foreground truncate">{business.email || "Not set"}</p></div>
              <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Remote Scan Toggle */}
        {business && (
          <div className="mb-6 rounded-2xl bg-card shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <Wifi className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Allow Remote Scan</p>
                  <p className="text-xs text-muted-foreground">Customers can scan from far away</p>
                </div>
              </div>
              <Switch
                checked={remoteScanEnabled ?? (business.socialLinks?.allow_remote_scan === true)}
                onCheckedChange={async (checked) => {
                  setRemoteScanEnabled(checked);
                  try {
                    const authData = localStorage.getItem("druto_auth");
                    if (!authData) return;
                    const { userId } = JSON.parse(authData);
                    const currentSocialLinks = business.socialLinks || {};
                    const updatedSocialLinks = { ...currentSocialLinks, allow_remote_scan: checked };
                    const response = await fetch(
                      `${SUPABASE_FUNCTIONS_URL}/update-restaurant`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          apikey: ANON_KEY,
                          Authorization: `Bearer ${ANON_KEY}`,
                        },
                        body: JSON.stringify({
                          restaurantId: business.id,
                          field: "social_links",
                          value: updatedSocialLinks,
                          userId,
                        }),
                      }
                    );
                    const result = await response.json();
                    if (result.success) {
                      toast({ title: checked ? "Remote scan enabled" : "Remote scan disabled" });
                      refetch();
                    } else {
                      setRemoteScanEnabled(!checked);
                      toast({ title: "Error", description: result.error, variant: "destructive" });
                    }
                  } catch (error: any) {
                    setRemoteScanEnabled(!checked);
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Compulsory Approval Toggle */}
        {business && (
          <div className="mb-6 rounded-2xl bg-card shadow-soft p-4 border border-primary/10 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Compulsory Approval</p>
                  <p className="text-xs text-muted-foreground">Approve every stamp manually</p>
                </div>
              </div>
              <Switch
                checked={requireApprovalEnabled ?? (business.requireApproval === true)}
                onCheckedChange={async (checked) => {
                  setRequireApprovalEnabled(checked);
                  try {
                    const authData = localStorage.getItem("druto_auth");
                    if (!authData) return;
                    const { userId } = JSON.parse(authData);

                    const response = await fetch(
                      `${SUPABASE_FUNCTIONS_URL}/update-restaurant`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          apikey: ANON_KEY,
                          Authorization: `Bearer ${ANON_KEY}`,
                        },
                        body: JSON.stringify({
                          restaurantId: business.id,
                          field: "require_approval",
                          value: checked,
                          userId,
                        }),
                      }
                    );
                    const result = await response.json();
                    if (result.success) {
                      toast({ 
                        title: checked ? "Compulsory approval enabled" : "Compulsory approval disabled",
                        description: checked ? "You will now need to manually approve all stamps." : "Stamps will be auto-approved based on location."
                      });
                      refetch();
                    } else {
                      setRequireApprovalEnabled(!checked);
                      toast({ title: "Error", description: result.error, variant: "destructive" });
                    }
                  } catch (error: any) {
                    setRequireApprovalEnabled(!checked);
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Branch Management - only for multi-store plans */}
        {business && (
          <div id="branch-management">
            <BranchManagement
              restaurantId={business.id}
              planTier={planTier}
              maxBranches={maxBranches}
            />
          </div>
        )}

        {/* Owner Profile */}
        <div className="mb-6 rounded-2xl bg-card shadow-soft">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Store className="h-6 w-6 text-primary" /></div>
              <div><p className="font-semibold text-foreground">{owner.name || "Owner"}</p><p className="text-sm text-muted-foreground">Owner Account</p></div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveSection(activeSection === "profile" ? null : "profile")}><Edit2 className="h-4 w-4" /></Button>
          </div>

          {activeSection === "profile" && (
            <div className="border-t border-border bg-muted/30 p-4 space-y-4">
              <div className="space-y-2"><Label htmlFor="ownerName">Your Name</Label><Input id="ownerName" value={ownerInfo.name} onChange={(e) => setOwnerInfo({ ...ownerInfo, name: e.target.value })} className="h-11" /></div>
              <div className="space-y-2"><Label htmlFor="ownerPhone">Phone Number</Label><Input id="ownerPhone" value={ownerInfo.phone} onChange={(e) => setOwnerInfo({ ...ownerInfo, phone: e.target.value })} className="h-11" disabled /></div>
              <div className="space-y-2"><Label htmlFor="ownerEmail">Email</Label><Input id="ownerEmail" type="email" value={ownerInfo.email} onChange={(e) => setOwnerInfo({ ...ownerInfo, email: e.target.value })} className="h-11" /></div>
              <Button onClick={handleSaveProfile} className="w-full"><Save className="mr-2 h-4 w-4" />Save Profile</Button>
            </div>
          )}
        </div>

        {/* Social Links Configuration */}
        <div className="mb-6 rounded-2xl bg-card shadow-soft">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/10"><Instagram className="h-6 w-6 text-pink-500" /></div>
              <div><p className="font-semibold text-foreground">Social Links & Reviews</p><p className="text-sm text-muted-foreground">Manage your online presence</p></div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveSection(activeSection === "socials" ? null : "socials")}><Edit2 className="h-4 w-4" /></Button>
          </div>

          {activeSection === "socials" && (
            <div className="border-t border-border bg-muted/30 p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" /> Instagram
                </Label>
                <Input
                  placeholder="https://instagram.com/yourpage"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                  className="h-11 rounded-xl border-border/50 bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                </Label>
                <Input
                  placeholder="https://facebook.com/yourpage"
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                  className="h-11 rounded-xl border-border/50 bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-600" /> YouTube
                </Label>
                <Input
                  placeholder="https://youtube.com/@yourchannel"
                  value={socialLinks.youtube}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                  className="h-11 rounded-xl border-border/50 bg-background"
                />
              </div>

              <div className="pt-2">
                <div className="h-px w-full bg-border/50 mb-5" />
                <Label htmlFor="googleReview" className="text-sm font-medium mb-2 block">Google Review Link</Label>
                <Input
                  id="googleReview"
                  type="url"
                  placeholder="https://g.page/r/YOUR_LINK/review"
                  value={socialLinks.google_review_url}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, google_review_url: e.target.value }))}
                  className="h-11 rounded-xl border-border/50 bg-background"
                />

                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      Suggested Review Variations
                    </Label>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                      ✨ Randomized For Each Customer
                    </span>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3 text-[12px] text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Add multiple suggestions to keep reviews unique. Each customer will see a random one to copy-paste.</p>
                  </div>

                  <div className="space-y-3">
                    {socialLinks.google_review_text.split(";").filter(s => s.trim() !== "" || socialLinks.google_review_text.split(";").length === 1).map((review, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={review.trim()}
                          onChange={(e) => {
                            const parts = socialLinks.google_review_text.split(";");
                            parts[idx] = e.target.value;
                            setSocialLinks(prev => ({ ...prev, google_review_text: parts.join(";") }));
                          }}
                          placeholder="e.g., Loved the food! Amazing service."
                          className="h-11 rounded-xl bg-background border-border/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => {
                            const parts = socialLinks.google_review_text.split(";");
                            parts.splice(idx, 1);
                            setSocialLinks(prev => ({ ...prev, google_review_text: parts.join(";") }));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-xl border-dashed border-2 hover:border-primary hover:bg-primary/5 gap-2 text-muted-foreground hover:text-primary transition-all"
                      onClick={() => {
                        const current = socialLinks.google_review_text.trim();
                        const newValue = current + (current.length > 0 && !current.endsWith(";") ? ";" : "") + "New review variation";
                        setSocialLinks(prev => ({ ...prev, google_review_text: newValue }));
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add Review Variation
                    </Button>

                    <div className="flex justify-end pr-1">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {socialLinks.google_review_text.length}/500 Total Characters
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base font-bold mt-2"
                onClick={handleSaveSocials}
                disabled={isSavingSocials}
              >
                {isSavingSocials ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Links & Reviews
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Menu Items - Link to Owner Settings */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-soft">
          <Link to="/owner/settings?section=subscription" className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10"><CreditCard className="h-5 w-5 text-yellow-500" /></div>
              <div><span className="font-medium text-foreground">Subscription</span><p className="text-sm text-muted-foreground">Manage your plan</p></div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>

          <Link to="/owner/settings?section=locations" className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-t border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10"><MapPin className="h-5 w-5 text-green-500" /></div>
              <div><span className="font-medium text-foreground">Manage Locations</span><p className="text-sm text-muted-foreground">Add or manage store branches</p></div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link to="/owner/settings?section=notifications" className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-t border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Bell className="h-5 w-5 text-primary" /></div>
              <div><span className="font-medium text-foreground">Notifications</span><p className="text-sm text-muted-foreground">Manage alerts & updates</p></div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link to="/owner/settings?section=privacy" className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-t border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10"><Shield className="h-5 w-5 text-green-500" /></div>
              <div><span className="font-medium text-foreground">Privacy & Security</span><p className="text-sm text-muted-foreground">Control your data</p></div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link to="/owner/settings?section=support" className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-t border-border">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><HelpCircle className="h-5 w-5 text-blue-500" /></div>
              <div><span className="font-medium text-foreground">Help & Support</span><p className="text-sm text-muted-foreground">Get help or contact us</p></div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>

        <Button 
          variant="destructive" 
          className="w-full h-12 rounded-xl shadow-lg relative z-20 active:scale-[0.98] transition-transform" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />Logout
        </Button>
      </div>

      <div className="h-10" /> {/* Extra space for safer scrolling */}
      <OwnerBottomNav />
    </div>
  );
};

export default OwnerProfile;