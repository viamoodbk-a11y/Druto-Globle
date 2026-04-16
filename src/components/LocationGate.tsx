import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useLocationValidation, SUPPORTED_AREAS } from "@/hooks/useLocationValidation";
import { cn } from "@/lib/utils";

interface LocationGateProps {
  children: React.ReactNode;
  /** Skip location check (for development or non-location features) */
  bypass?: boolean;
  /** Custom message for blocked state */
  blockedMessage?: string;
}

/**
 * LocationGate Component
 * Validates user location before allowing access to protected content.
 * Shows appropriate UI for:
 * - Loading/validating state
 * - Location denied/unavailable
 * - Outside service area
 * - Valid location (renders children)
 */
export const LocationGate = ({ 
  children, 
  bypass = false,
  blockedMessage = "Druto is currently available only in select cities. We're expanding soon!"
}: LocationGateProps) => {
  const [hasAttempted, setHasAttempted] = useState(false);
  const { 
    isValidating, 
    isWithinServiceArea, 
    nearestArea, 
    distanceToNearestArea,
    error, 
    validateLocation,
    clearError
  } = useLocationValidation();

  // Auto-validate on mount
  useEffect(() => {
    if (!bypass && !hasAttempted) {
      validateLocation().then(() => setHasAttempted(true));
    }
  }, [bypass, hasAttempted, validateLocation]);

  // If bypass is enabled, render children directly
  if (bypass) {
    return <>{children}</>;
  }

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Checking your location...
          </h2>
          <p className="text-muted-foreground text-sm">
            Please allow location access when prompted
          </p>
        </div>
      </div>
    );
  }

  // Show error state (permission denied, unavailable, etc.)
  if (error && !isWithinServiceArea) {
    const isPermissionDenied = error.toLowerCase().includes("permission");
    
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className={cn(
            "h-20 w-20 mx-auto rounded-full flex items-center justify-center mb-6",
            isPermissionDenied ? "bg-yellow-500/10" : "bg-destructive/10"
          )}>
            {isPermissionDenied ? (
              <MapPin className="h-10 w-10 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-destructive" />
            )}
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            {isPermissionDenied ? "Location Access Required" : "Location Unavailable"}
          </h2>
          
          <p className="text-muted-foreground text-sm mb-6">
            {error}
          </p>

          {isPermissionDenied && (
            <div className="p-4 rounded-xl bg-muted/50 mb-6 text-left">
              <p className="text-xs text-muted-foreground">
                <strong>How to enable:</strong>
                <br />
                1. Open your browser settings
                <br />
                2. Go to Site Settings → Location
                <br />
                3. Allow location for this site
              </p>
            </div>
          )}

          <Button 
            variant="hero" 
            className="w-full"
            onClick={() => {
              clearError();
              setHasAttempted(false);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show outside service area state
  if (hasAttempted && isWithinServiceArea === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-20 w-20 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
            <MapPin className="h-10 w-10 text-orange-600" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            Not Available in Your Area
          </h2>
          
          <p className="text-muted-foreground text-sm mb-4">
            {blockedMessage}
          </p>

          {nearestArea && distanceToNearestArea && (
            <div className="p-4 rounded-xl bg-muted/50 mb-6">
              <p className="text-sm text-foreground">
                You are <span className="font-bold text-primary">{distanceToNearestArea} km</span> from {nearestArea}
              </p>
            </div>
          )}

          <div className="text-left mb-6">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Currently available in:</p>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_AREAS.map((area) => (
                <div 
                  key={area.name}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-foreground">{area.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              clearError();
              setHasAttempted(false);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Again
          </Button>
        </div>
      </div>
    );
  }

  // Location validated - render children
  if (isWithinServiceArea) {
    return <>{children}</>;
  }

  // Default: waiting for validation
  return null;
};
