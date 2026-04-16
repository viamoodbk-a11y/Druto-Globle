import { useRef, useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode, Download, Copy, Check, Plus, Loader2, Calendar, Zap, Star
} from "lucide-react";
import { CurrentRewardCard } from "@/components/CurrentRewardCard";
import { SubscriptionGate } from "@/components/SubscriptionGate";

const AnalyticsChart = lazy(() =>
  import("@/components/AnalyticsChart").then(m => ({ default: m.AnalyticsChart }))
);
import { PendingScansSection } from "@/components/owner/PendingScansSection";
import { generateQRPoster, downloadBlob } from "@/lib/qrPosterGenerator";
import { useToast } from "@/hooks/use-toast";
import type { PendingScan } from "@/hooks/useOwnerData";

interface OverviewTabProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  rewards: Array<{
    id: string;
    name: string;
    description: string | null;
    stampsRequired: number;
    expiryDays: number | null;
    rewardImageUrl: string | null;
  }>;
  stats: {
    totalScans: number;
    todayScans: number;
    uniqueCustomers: number;
    activeCards: number;
    rewardsRedeemed: number;
    completedCards: number;
    repeatRate: number;
    pendingScansCount: number;
  };
  customers: Array<any>;
  pendingScans: PendingScan[];
  ownerId: string;
  ownerSubscriptionActive: boolean;
  subscriptionLoading: boolean;
  refetchSubscription: () => void;
  onEditReward: () => void;
  refetch: () => void;
}

export const OverviewTab = ({
  restaurant,
  rewards,
  stats,
  customers,
  pendingScans,
  ownerId,
  ownerSubscriptionActive,
  subscriptionLoading,
  refetchSubscription,
  onEditReward,
  refetch,
}: OverviewTabProps) => {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState(false);

  const scanUrl = `https://druto.in/scan/${restaurant.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link with your customers",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPoster = async () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    setIsDownloadingPoster(true);
    try {
      const posterBlob = await generateQRPoster({
        qrCodeSvg: svg,
        restaurantName: restaurant.name,
      });
      downloadBlob(posterBlob, `${restaurant.name}-poster.png`);
      toast({ title: "QR Poster downloaded!" });
    } catch (error) {
      console.error('Error generating poster:', error);
      toast({
        title: "Download failed",
        description: "Could not generate poster. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloadingPoster(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pending Scans Section - Show at top if there are pending approvals */}
      {pendingScans.length > 0 && (
        <PendingScansSection
          pendingScans={pendingScans}
          restaurantOwnerId={ownerId}
          onActionComplete={refetch}
        />
      )}

      {/* QR Code Section */}
      <SubscriptionGate
        isSubscribed={ownerSubscriptionActive}
        isLoading={subscriptionLoading}
        restaurantId={restaurant.id}
        onSubscriptionSuccess={refetchSubscription}
      >
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Your QR Code</h2>
          </div>
          <div className="flex flex-col items-center">
            <div ref={qrRef} className="mb-4 rounded-2xl bg-white p-4 shadow-inner">
              {scanUrl ? (
                <QRCodeSVG
                  value={scanUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                />
              ) : (
                <div className="h-40 w-40 bg-muted flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="mb-4 text-center text-[13px] text-muted-foreground">
              Display at your counter for customers to scan
            </p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleCopyLink} className="flex-1 h-11">
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy Link
              </Button>
              <Button
                variant="hero"
                disabled={isDownloadingPoster}
                onClick={handleDownloadPoster}
                className="flex-1 h-11"
              >
                {isDownloadingPoster ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloadingPoster ? "..." : "Download"}
              </Button>
            </div>
          </div>
        </div>
      </SubscriptionGate>

      {/* Current Reward */}
      {rewards.length > 0 && (
        <CurrentRewardCard
          name={rewards[0].name}
          description={rewards[0].description}
          imageUrl={rewards[0].rewardImageUrl}
          stampsRequired={rewards[0].stampsRequired}
          expiryDays={rewards[0].expiryDays}
          onEdit={onEditReward}
        />
      )}

      {/* Today's Activity */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Today's Activity</h2>
          <span className="text-[12px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-green-500/10 p-4 text-center">
            <Zap className="mx-auto mb-2 h-5 w-5 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.todayScans}</p>
            <p className="text-[11px] text-green-600/80 font-medium">Scans Today</p>
          </div>
          <div className="rounded-xl bg-yellow-500/10 p-4 text-center">
            <Star className="mx-auto mb-2 h-5 w-5 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-600">{stats.completedCards}</p>
            <p className="text-[11px] text-yellow-600/80 font-medium">Completed</p>
          </div>
        </div>
      </div>

      {/* Analytics - lazy loaded to reduce initial bundle */}
      <Suspense fallback={<div className="rounded-2xl bg-muted h-32 animate-pulse" />}>
        <AnalyticsChart customers={customers} />
      </Suspense>
    </div>
  );
};
