import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Gift, Clock, MapPin, Upload, Loader2, Image as ImageIcon, Info, Instagram, Facebook, Youtube, MessageSquare, ChevronLeft, Star, Plus, Trash2, Navigation, Camera, Store, Smartphone } from "lucide-react";
import { useRewardConfig } from "@/hooks/useRewardConfig";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/use-toast";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  stampsRequired: number;
  expiryDays: number | null;
  rewardImageUrl: string | null;
  icon?: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string | null;
  googleReviewUrl: string | null;
  openingHours: any | null;
  socialLinks?: { instagram?: string; facebook?: string; youtube?: string; google_review_text?: string } | null;
  address?: string | null;
  icon?: string | null;
}

interface SettingsTabProps {
  restaurant: Restaurant;
  rewards: Reward[];
  refetch?: () => void;
  scratchCardConfigs?: {
    id?: string;
    isEnabled: boolean;
    oddsNumerator: number;
    oddsDenominator: number;
    rewardTitle: string;
    rewardDescription?: string;
    rewardImageUrl?: string;
  }[];
  clearCache?: () => void;
}

export const SettingsTab = ({ restaurant, rewards, refetch, scratchCardConfigs: initialScratchConfigs, clearCache }: SettingsTabProps) => {
  const { toast } = useToast();
  const { saveRewardConfig, isSavingRewards, isSavingScratch } = useRewardConfig();
  const { uploadImage, isUploading } = useImageUpload();
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const hasInitialized = useRef(false);

  const [localRewards, setLocalRewards] = useState<Reward[]>([
    { id: 'temp-1', name: '', description: 'Special Reward', stampsRequired: 10, expiryDays: 30, rewardImageUrl: '', icon: '🎁' }
  ]);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  type ScratchCardConfigType = NonNullable<SettingsTabProps['scratchCardConfigs']>[0];
  const [scratchConfigs, setScratchConfigs] = useState<ScratchCardConfigType[]>([{
    isEnabled: false,
    oddsNumerator: 1,
    oddsDenominator: 10,
    rewardTitle: "Special Prize",
    rewardDescription: "",
    rewardImageUrl: ""
  }]);
  const [isScratchEnabled, setIsScratchEnabled] = useState(false);
  const hasInitializedScratch = useRef(false);

  // Update scratch card state when config loads  
  useEffect(() => {
    if (initialScratchConfigs && initialScratchConfigs.length > 0) {
      setScratchConfigs(initialScratchConfigs);
      // Global toggle is ON if any card is enabled
      setIsScratchEnabled(initialScratchConfigs.some(c => c.isEnabled));
      hasInitializedScratch.current = true;
    } else if (initialScratchConfigs && initialScratchConfigs.length === 0 && !hasInitializedScratch.current) {
      // Only set default if we haven't initialized already and we have definitive empty data
      setScratchConfigs([{
        isEnabled: false,
        oddsNumerator: 1,
        oddsDenominator: 10,
        rewardTitle: "Special Prize",
        rewardDescription: "",
        rewardImageUrl: ""
      }]);
      hasInitializedScratch.current = true;
    }
  }, [initialScratchConfigs]);

  const scratchImageInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const handleScratchImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant) return;

    const result = await uploadImage(file, `scratch/${restaurant.id}`);

    if (result.success && result.url) {
      setScratchConfigs(prev => prev.map((c, i) => i === index ? { ...c, rewardImageUrl: result.url! } : c));
      toast({ title: "Image uploaded!", description: "Scratch card image has been updated" });
    } else {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    }
  };

  const addScratchCard = () => {
    const tempId = `temp-${Date.now()}`;
    setScratchConfigs(prev => [...prev, {
      id: tempId,
      isEnabled: true,
      oddsNumerator: 1,
      oddsDenominator: 10,
      rewardTitle: "New Reward",
      rewardDescription: "",
      rewardImageUrl: ""
    }]);
  };

  const removeScratchCard = (index: number) => {
    setScratchConfigs(prev => prev.filter((_, i) => i !== index));
  };

  const updateScratchConfig = (index: number, updates: Partial<ScratchCardConfigType>) => {
    setScratchConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  useEffect(() => {
    if (rewards && rewards.length > 0 && !hasInitialized.current) {
      setLocalRewards(rewards.map(r => {
        let textDescription = r.description || "Free reward";
        let iconMatch = textDescription.match(/\[icon:(.+?)\]/);
        let icon = (r as any).icon || '🎁';
        
        if (iconMatch) {
          icon = iconMatch[1];
          textDescription = textDescription.replace(/\[icon:.*?\]/g, '');
        }

        return {
          id: r.id,
          name: r.name,
          description: textDescription,
          stampsRequired: r.stampsRequired || 10,
          expiryDays: r.expiryDays || 30,
          rewardImageUrl: r.rewardImageUrl || "",
          icon: icon,
        };
      }));
      hasInitialized.current = true;
    }
  }, [rewards]);

  const handleRewardImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant) return;

    const result = await uploadImage(file, `rewards/${restaurant.id}`);

    if (result.success && result.url) {
      setLocalRewards(prev => prev.map((r, i) => i === index ? { ...r, rewardImageUrl: result.url! } : r));
      toast({ title: "Image uploaded!", description: "Reward image has been updated" });
    } else {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    }

    const inputRef = fileInputRefs.current[index];
    if (inputRef) {
      inputRef.value = "";
    }
  };

  const addReward = () => {
    const tempId = `temp-${Date.now()}`;
    setLocalRewards(prev => [...prev, {
      id: tempId,
      name: '',
      description: 'Special Reward',
      stampsRequired: 10,
      expiryDays: 30,
      rewardImageUrl: '',
      icon: '🎁'
    }]);
  };

  const removeReward = (index: number) => {
    if (localRewards.length <= 1) {
      toast({ title: "Cannot delete", description: "You must have at least one reward program", variant: "destructive" });
      return;
    }
    setLocalRewards(prev => prev.filter((_, i) => i !== index));
  };
  const handleSave = async () => {
    if (!restaurant) return;

    // Filter out temp IDs for saving
    const rewardsToSave = localRewards.map(r => ({
      ...r,
      id: r.id?.startsWith('temp-') ? undefined : r.id,
      name: r.name || (r.description || "").substring(0, 50) || "Free Reward",
      icon: r.icon || '🎁'
    }));

    try {
      if (clearCache) clearCache();
      const result = await saveRewardConfig(
        restaurant.id,
        rewardsToSave as any,
        {
          googleReviewUrl: restaurant.googleReviewUrl,
          openingHours: restaurant.openingHours,
        },
        undefined,
        'rewards'
      );

      if (result.success) {
        toast({
          title: "Settings saved!",
          description: "Your reward program has been updated",
        });
        if (refetch) {
          // Add a slight delay to ensure DB transaction settled before refetch
          setTimeout(() => refetch(), 500);
        }
      } else {
        toast({
          title: "Error saving settings",
          description: result.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("handleSave error:", error);
      toast({
        title: "Error saving settings",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSaveScratchCards = async () => {
    console.log("handleSaveScratchCards started", { restaurant: restaurant?.id, isScratchEnabled });
    if (!restaurant) {
      console.warn("handleSaveScratchCards aborted: No restaurant found");
      return;
    }



    try {
      if (clearCache) clearCache();
      
      // Filter out temp IDs for saving, exactly like handleSave does for rewards
      const configsToSave = scratchConfigs.map(c => ({
        ...c,
        id: c.id?.startsWith('temp-') ? undefined : c.id,
        isEnabled: isScratchEnabled
      }));

      const result = await saveRewardConfig(
        restaurant.id,
        undefined,
        undefined,
        configsToSave,
        'scratch'
      );

      if (result.success) {
        toast({
          title: "Scratch cards saved!",
          description: "Your scratch card configuration has been updated",
        });
        
        // Update local state IMMEDIATELY from the response
        if (result.scratchCardConfigs && result.scratchCardConfigs.length > 0) {
          console.log("Synchronizing UI state with server response:", result.scratchCardConfigs);
          setScratchConfigs(result.scratchCardConfigs);
          setIsScratchEnabled(result.scratchCardConfigs.some(c => c.isEnabled));
        }

        if (refetch) {
          refetch();
        }
      } else {
        toast({
          title: "Error saving scratch cards",
          description: result.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("handleSaveScratchCards CRITICAL error:", error);
      toast({
        title: "Critical Save Error",
        description: error.message || "Please check your internet connection",
        variant: "destructive",
      });
    }
  };

  // Renders the mock mobile phone preview
  const renderPreview = () => {
    return (
      <div className="relative w-[320px] h-[640px] rounded-[48px] border-[12px] border-zinc-900 bg-background dark:bg-zinc-950 shadow-[0_0_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden shrink-0 flex flex-col font-sans mx-auto transition-all duration-300">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 inset-x-0 mx-auto w-[110px] h-[30px] bg-zinc-900 rounded-b-[20px] z-50 flex items-center justify-center">
          <div className="h-1.5 w-12 bg-zinc-800 rounded-full" />
        </div>

        {/* Mobile Status Bar */}
        <div className="w-full h-11 flex justify-between items-end px-8 pb-1.5 relative z-40 bg-[#900A12]">
          <span className="text-[12px] font-bold text-white">9:41</span>
          <div className="flex gap-1.5 items-center">
             <div className="flex gap-0.5">
                {[...Array(4)].map((_, i) => (
                   <div key={i} className={cn("w-0.5 rounded-full bg-white", i === 3 ? "h-2" : `h-${1 + i}`)} />
                ))}
             </div>
             <div className="flex items-center gap-0.5">
               <span className="text-[10px] font-bold text-white">LTE</span>
               <div className="w-5 h-2.5 rounded-[3px] border border-white/50 relative flex items-center p-[1px]">
                  <div className="h-full w-3 bg-white rounded-[1px]" />
                  <div className="absolute -right-1 h-1 w-0.5 bg-white/50 rounded-r-sm" />
               </div>
             </div>
          </div>
        </div>

        {/* Scrollable Content inside Mock Phone */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-0 bg-background dark:bg-zinc-950">
          {/* Header - Matching RestaurantDetail */}
          <div className="gradient-primary rounded-b-[2.5rem] px-5 pt-10 pb-8">
            <div className="flex items-center gap-3">
              {/* Restaurant Logo */}
              <div className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center text-2xl overflow-hidden shadow-lg border border-white/10">
                {restaurant?.logoUrl ? (
                  <img src={restaurant.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-bold text-white">{restaurant?.name?.charAt(0) || "B"}</span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">
                  {restaurant?.name || "Your Business"}
                </h1>
                <p className="text-[11px] text-white/80 tracking-wide font-medium uppercase">PREMIUM PARTNER ✓</p>
              </div>
            </div>

            {/* Big stamp count - Matching RestaurantDetail */}
            {(() => {
              const sorted = [...localRewards].sort((a, b) => (a.stampsRequired || 10) - (b.stampsRequired || 10));
              const firstMilestone = sorted[0]?.stampsRequired || 10;
              
              return (
                <div className="mt-5">
                  <h2 className="text-[32px] font-extrabold text-white leading-tight">
                    0 of {firstMilestone} Stamps
                  </h2>
                  <div className="mt-3">
                    <div className="h-[8px] rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full w-0 bg-white rounded-full transition-all duration-500" />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="px-4 -mt-1 relative z-10 space-y-3 pt-3 pb-10">
            {/* Rewards Section - Matching RestaurantDetail 1:1 */}
            <div className="space-y-2.5">
              {[...localRewards].sort((a, b) => (a.stampsRequired || 10) - (b.stampsRequired || 10)).map((reward, i) => (
                <div key={i} className="rounded-2xl bg-card shadow-card p-3.5 flex items-center gap-3.5 border border-border/40 transition-transform active:scale-[0.98]">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {reward.rewardImageUrl ? (
                      <img src={reward.rewardImageUrl} className="w-full h-full object-cover" alt="Reward" />
                    ) : (
                      <Gift className="h-6 w-6 text-primary/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-foreground leading-tight line-clamp-2">
                       {reward.description || "Free Reward"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {reward.stampsRequired} STAMPS
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                        • Collect {reward.stampsRequired} more
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stamp Grid - Matching RestaurantDetail 1:1 */}
            <div className="rounded-2xl bg-card shadow-card p-5 border border-border/20">
              <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-4">
                STAMP CARD
              </h3>
              {(() => {
                const sorted = [...localRewards].sort((a, b) => (a.stampsRequired || 10) - (b.stampsRequired || 10));
                const firstMilestone = sorted[0]?.stampsRequired || 10;
                const maxPossibleStamps = Math.max(...sorted.map(r => r.stampsRequired || 10), 10);
                
                return (
                  <div>
                    <div className="grid grid-cols-6 gap-2.5 mb-4 items-center">
                      {Array.from({ length: maxPossibleStamps }).map((_, i) => {
                        const stampNumber = i + 1;
                        const isBeyondCurrentMilestone = stampNumber > firstMilestone;
                        const isRewardPoint = sorted.some(r => r.stampsRequired === stampNumber);
                        
                        return (
                          <div
                            key={i}
                            className="relative flex items-center justify-center"
                          >
                            <div
                              className={cn(
                                "aspect-square flex items-center justify-center shrink-0 transition-all duration-300",
                                (isBeyondCurrentMilestone && !isRewardPoint)
                                  ? "h-4 w-4 rounded-full border border-primary/20 bg-primary/5" 
                                  : "w-full rounded-xl border-2 border-dashed border-primary/30 bg-transparent"
                              )}
                            >
                              {isRewardPoint && (
                                <Gift className="h-5 w-5 text-primary/60" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-center text-[13px] text-muted-foreground mt-3">
                      You're <span className="text-primary font-bold">{firstMilestone} stamps</span> away from your treat!
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Business Info Section - Matching RestaurantDetail style */}
            <div className="rounded-2xl bg-card shadow-soft p-4 border border-border/30">
              <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-4">
                BUSINESS INFO
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <MapPin className="h-4 w-4 text-primary" />
                   </div>
                   <div className="flex-1 pt-1">
                      <p className="text-[14px] font-medium text-foreground">Our Location</p>
                      <p className="text-[12px] text-muted-foreground truncate">{restaurant?.address || 'Address not listed'}</p>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                     <Clock className="h-4 w-4 text-emerald-500" />
                   </div>
                   <div className="flex-1 pt-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Open Now</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground">09:00 AM – 09:00 PM</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Home Bar */}
        <div className="h-8 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center relative z-50">
          <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Forms */}
      <div className="space-y-6">
        {/* Mobile Preview Sticky Button */}
        <div className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <Button 
            onClick={() => setShowMobilePreview(true)}
            className="rounded-full h-14 px-8 shadow-2xl bg-[#900A12] hover:bg-[#900A12]/90 text-white border-2 border-white/20 backdrop-blur-sm gap-2 font-bold scale-105"
          >
            <Smartphone className="w-5 h-5" />
            Live Preview
          </Button>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Reward Programs
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addReward}
              className="h-8 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Reward
            </Button>
          </div>

          <div className="space-y-8">
            {localRewards.map((reward, index) => (
              <div key={reward.id || index} className={cn(
                "p-6 rounded-2xl border bg-background relative group transition-all shadow-sm",
                index > 0 && "mt-6"
              )}>
                {localRewards.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg z-10"
                    onClick={() => removeReward(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Side: Image Upload */}
                  <div className="w-full md:w-32 shrink-0">
                    <Label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider">Reward Image</Label>
                    <input
                      ref={el => fileInputRefs.current[index] = el!}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleRewardImageUpload(index, e)}
                      className="hidden"
                    />

                    {reward.rewardImageUrl ? (
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden group shadow-sm border border-border/50">
                        <img
                          src={reward.rewardImageUrl}
                          alt="Reward"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full h-8 w-8"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            disabled={isUploading}
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={isUploading}
                        className="w-full aspect-square rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 bg-background hover:bg-muted/10 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground"
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase">Add</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Right Side: Details */}
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Visits Required */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Visits Required</Label>
                        <div className="flex items-center gap-3 bg-background rounded-xl p-1 border border-border/50">
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={reward.stampsRequired || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setLocalRewards(prev => prev.map((r, i) => i === index ? { ...r, stampsRequired: val } : r));
                            }}
                            className="h-10 w-16 border-0 text-center font-bold"
                          />
                          <span className="text-xs text-muted-foreground pr-3 font-medium">visits</span>
                        </div>
                      </div>

                      {/* Expiry Days */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reward Expiry</Label>
                        <div className="flex items-center gap-3 bg-background rounded-xl p-1 border border-border/50">
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={reward.expiryDays || ""}
                            onChange={(e) => {
                              const newRewards = [...localRewards];
                              newRewards[index].expiryDays = parseInt(e.target.value) || 1;
                              setLocalRewards(newRewards);
                            }}
                            className="h-10 w-16 border-0 text-center font-bold"
                          />
                          <span className="text-xs text-muted-foreground pr-3 font-medium">days</span>
                        </div>
                      </div>
                    </div>

                    {/* Reward Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reward Description</Label>
                      <div className="flex gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                          <Gift className="h-5 w-5 text-primary/70" />
                        </div>
                        <Input
                          placeholder="e.g., Free product or discount"
                          value={reward.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalRewards(prev => prev.map((r, i) => i === index ? { ...r, description: val } : r));
                          }}
                          className="h-12 rounded-xl border-border/50 bg-background flex-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <hr className="border-border/50" />

            <Button
              className="w-full h-14 rounded-2xl text-[15px] font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSavingRewards}
            >
              {isSavingRewards ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Reward Program"
              )}
            </Button>

            {/* Scratch Card Configuration - ONLY FOR BORCELLA TEST */}
            {restaurant.name?.toLowerCase().includes("borcella") && (
              <div className="mt-6 rounded-2xl bg-card shadow-card p-5 border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                      <span className="text-lg">🎰</span>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-foreground">Scratch Cards</h3>
                      <p className="text-[11px] text-muted-foreground">Bonus reward games for customers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border/50 shadow-sm">
                      <span className={cn("text-[10px] font-bold uppercase", isScratchEnabled ? "text-green-500" : "text-muted-foreground")}>
                        {isScratchEnabled ? "Active" : "Disabled"}
                      </span>
                      <Switch
                        checked={isScratchEnabled}
                        onCheckedChange={setIsScratchEnabled}
                        className="scale-90"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-xl border-dashed border-2 text-primary hover:text-primary hover:bg-primary/5 text-xs font-semibold"
                      onClick={addScratchCard}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Card
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-border/30">
                  {scratchConfigs.map((config, index) => (
                    <div key={config.id || `scratch-${index}`} className="p-4 rounded-xl border border-border/50 bg-muted/20 relative mt-4 group">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/10">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Config {index + 1}</Label>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeScratchCard(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {/* Odds Configuration */}
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Win Probability</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={config.oddsNumerator}
                                onChange={(e) => updateScratchConfig(index, { oddsNumerator: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="h-10 w-20 text-center rounded-xl font-bold bg-background"
                              />
                              <span className="text-sm text-muted-foreground font-medium">out of</span>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={config.oddsDenominator}
                                onChange={(e) => updateScratchConfig(index, { oddsDenominator: Math.max(1, parseInt(e.target.value) || 10) })}
                                className="h-10 w-20 text-center rounded-xl font-bold bg-background"
                              />
                              <span className="text-xs text-muted-foreground">will win</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {Math.round((config.oddsNumerator / config.oddsDenominator) * 100)}% chance of winning
                            </p>
                          </div>

                          {/* Reward Title */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Reward Title</Label>
                            <Input
                              placeholder="e.g. Free Coffee, 20% Off"
                              value={config.rewardTitle}
                              onChange={(e) => updateScratchConfig(index, { rewardTitle: e.target.value })}
                              className="h-12 rounded-xl bg-background"
                            />
                          </div>

                          {/* Reward Description */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Reward Description</Label>
                            <Input
                              placeholder="e.g. Get a free cappuccino on your next visit"
                              value={config.rewardDescription || ""}
                              onChange={(e) => updateScratchConfig(index, { rewardDescription: e.target.value })}
                              className="h-12 rounded-xl bg-background"
                            />
                          </div>

                          {/* Reward Image */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Reward Image</Label>
                            <div className="flex items-center gap-3">
                              {config.rewardImageUrl ? (
                                <div className="h-16 w-16 rounded-xl overflow-hidden border border-border/50">
                                  <img src={config.rewardImageUrl} className="w-full h-full object-cover" alt="Scratch reward" />
                                </div>
                              ) : (
                                <div className="h-16 w-16 rounded-xl bg-background flex items-center justify-center border border-border/50">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <input
                                ref={el => {
                                  if (el) scratchImageInputRefs.current[index] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleScratchImageUpload(index, e)}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl bg-background"
                                onClick={() => scratchImageInputRefs.current[index]?.click()}
                                disabled={isUploading}
                              >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                Upload
                              </Button>
                            </div>
                          </div>
                        </div>
                    </div>
                  ))}

                  {/* Removed bulky add button, moved to header */}

                  {/* Save scratch card config with isolated submit */}
                  <Button
                    variant="hero"
                    className="w-full h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 mt-4"
                    onClick={() => handleSaveScratchCards()}
                    disabled={isSavingScratch}
                  >
                    {isSavingScratch ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Scratch Card"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        </div>

      {/* Right Column: Live Mobile UI Preview - Desktop Only */}
      <div className="hidden lg:block w-[360px] shrink-0 sticky top-24 self-start">
        <div className="flex items-center gap-2 mb-4 w-full justify-center">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-bold text-[10px] text-foreground uppercase tracking-widest">Live Mobile Preview</h3>
        </div>
        <div className="scale-[0.85] origin-top">
          {renderPreview()}
        </div>
      </div>

      {/* Mobile Preview Modal */}
      <Dialog open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-fit h-fit outline-none overflow-visible">
          <DialogHeader className="sr-only">
             <DialogTitle>Live Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4 scale-[0.8] sm:scale-100 origin-center">
             {renderPreview()}
             <Button 
               onClick={() => setShowMobilePreview(false)}
               variant="secondary"
               className="rounded-full px-10 h-12 font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md"
             >
               Close Preview
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
