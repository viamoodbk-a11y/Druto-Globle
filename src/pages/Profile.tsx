import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Mail,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Edit2,
  Moon,
  HelpCircle,
  Loader2,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProfileData } from "@/hooks/useProfileData";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { OptimizedImage } from "@/components/OptimizedImage";


const Profile = () => {
  const navigate = useNavigate();
  const profile = useProfileData();
  const { uploadImage, isUploading } = useImageUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = useCallback(async () => {
    await profile.refetch();
  }, [profile.refetch]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile.id) return;

    const result = await uploadImage(file, `avatars/${profile.id}`);

    if (result.success && result.url) {
      const { data: updateResult, error } = await supabase.functions.invoke("update-profile", {
        body: {
          userId: profile.id,
          avatarUrl: result.url,
        },
      });

      if (error || !updateResult?.success) {
        toast.error(updateResult?.error || error?.message || "Failed to update avatar");
      } else {
        profile.refetch();
      }
    } else {
      toast.error(result.error || "Upload failed");
    }

    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  if (profile.fullName && !name && !isEditing) {
    setName(profile.fullName);
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsSaving(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("update-profile", {
        body: {
          userId: profile.id,
          fullName: name.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);

      setIsEditing(false);
      profile.refetch();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("druto_auth");
      localStorage.removeItem("druto_post_auth_redirect");
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.clear();
      navigate("/");
    }
  };

  const menuItems = [
    { icon: Bell, label: "Notifications", action: () => navigate("/settings") },
    { icon: Moon, label: "Dark Mode", action: () => navigate("/settings") },
    { icon: Shield, label: "Privacy & Security", action: () => navigate("/settings") },
    { icon: HelpCircle, label: "Help & Support", action: () => navigate("/settings") },
  ];

  if (profile.isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-background pb-24">
      {/* Header with curved bottom */}
      <div className="gradient-primary rounded-b-[2.5rem] px-5 pt-6 pb-12 text-center relative">
        <h1 className="text-lg font-bold text-white mb-3">My Profile</h1>

        {/* Avatar */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <div className="relative inline-block">
          <div className="h-24 w-24 rounded-full border-4 border-white/30 overflow-hidden bg-white/20">
            {profile.avatarUrl ? (
              <OptimizedImage src={profile.avatarUrl} alt={name || "Profile Avatar"} width={192} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-4xl">👤</div>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white"
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 text-white animate-spin" />
            ) : (
              <Edit2 className="h-3 w-3 text-white" />
            )}
          </button>
        </div>

        {/* Name */}
        <div className="mt-3">
          {isEditing ? (
            <div className="flex gap-2 justify-center items-center max-w-xs mx-auto">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-center"
                placeholder="Enter your name"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {profile.isLoading && !profile.fullName ? (
                  <Skeleton className="h-7 w-40 bg-white/20" />
                ) : (
                  profile.fullName || "User"
                )}
              </h2>
              <button onClick={() => { setIsEditing(true); setName(profile.fullName || ""); }}>
                <Edit2 className="h-3.5 w-3.5 text-white/70" />
              </button>
            </div>
          )}
          {/* Member badge - inline with name */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="px-2.5 py-1 rounded-full bg-foreground/90 text-background text-[10px] font-bold uppercase tracking-wide">
              Gold Member
            </span>
            <span className="text-white/70 text-[12px]">
              SINCE {profile.memberSince?.toUpperCase() || "OCT 2023"}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="px-4 -mt-10">
        <div className="rounded-2xl bg-card shadow-card p-5">
          <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-4">
            CONTACT INFORMATION
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone Number</p>
                <p className="text-[14px] font-semibold text-foreground">
                  {profile.isLoading && !profile.phone ? (
                    <Skeleton className="h-5 w-32 mt-1" />
                  ) : (
                    profile.phone ? `+91 ${profile.phone}` : "Not set"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email Address</p>
                <p className={cn(
                  "text-[14px] font-semibold",
                  profile.email ? "text-foreground" : "text-muted-foreground italic"
                )}>
                  {profile.email || "Not set"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              APP SETTINGS
            </h3>
          </div>

          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors",
                i < menuItems.length - 1 && "border-b border-border/30"
              )}
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left text-[14px] font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="h-10" /> {/* Safe area for scrolling above nav */}
    </PullToRefresh>

    {/* Sign Out Button - Moved OUTSIDE PullToRefresh to ensure no touch interference */}
    <div className="px-4 py-6 bg-background relative z-30 mb-20">
      <Button
        variant="destructive"
        onClick={handleLogout}
        className="w-full h-14 rounded-2xl shadow-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 font-bold text-base"
      >
        <LogOut className="h-5 w-5" />
        Sign Out
      </Button>
    </div>
  </>
);
};

export default Profile;
