import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, MapPin, Phone, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PendingScan } from "@/hooks/useOwnerData";

interface PendingScansSectionProps {
  pendingScans: PendingScan[];
  restaurantOwnerId: string;
  onActionComplete: () => void;
}

export const PendingScansSection = ({
  pendingScans,
  restaurantOwnerId,
  onActionComplete,
}: PendingScansSectionProps) => {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (scanId: string, action: "accept" | "decline") => {
    setProcessingId(scanId);
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/manage-scan-approval`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey:
              ANON_KEY,
          },
          body: JSON.stringify({
            scanId,
            ownerId: restaurantOwnerId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: action === "accept" ? "Scan Approved ✓" : "Scan Declined",
          description:
            action === "accept"
              ? "Stamp added to customer's card"
              : "Scan has been removed",
        });
        onActionComplete();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process scan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingScans.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card mb-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Pending Approvals
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {pendingScans.length} scan{pendingScans.length !== 1 ? "s" : ""}{" "}
              waiting
            </p>
          </div>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {pendingScans.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {pendingScans.map((scan) => (
          <div
            key={scan.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {scan.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{scan.customerPhone}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{scan.scannedAt}</span>
                  {scan.locationVerified && (
                    <span className="flex items-center gap-1 text-green-600">
                      <MapPin className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(scan.id, "decline")}
                  disabled={processingId === scan.id}
                  className="h-9 w-9 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {processingId === scan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(scan.id, "accept")}
                  disabled={processingId === scan.id}
                  className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700"
                >
                  {processingId === scan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
