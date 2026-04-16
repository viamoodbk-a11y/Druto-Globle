import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Flashlight, ImagePlus, X, QrCode, CheckCircle2, AlertCircle, MapPin, Loader2, Navigation, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import jsQR from "jsqr";
import { StampSuccessAnimation } from "@/components/StampSuccessAnimation";
import { ScratchCard } from "@/components/ScratchCard";
import { useScanLogic } from "@/hooks/useScanLogic";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";

type ScanState = "ready" | "scanning" | "verifying-location" | "acquiring-location" | "success" | "pending-approval" | "already-scanned" | "manual-verification" | "error" | "location-error" | "location-disabled" | "loyalty-paused";

const Scanner = () => {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanRafRef = useRef<number | null>(null);
  const hasProcessedRef = useRef(false);

  const [scanState, setScanState] = useState<ScanState>("ready");
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showStampAnimation, setShowStampAnimation] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);
  const [isPreloadingLocation, setIsPreloadingLocation] = useState(false);
  const [pendingScanRestaurantId, setPendingScanRestaurantId] = useState<string | null>(null);
  const [allowRemoteScan, setAllowRemoteScan] = useState<boolean>(false);
  const [scratchCardData, setScratchCardData] = useState<{
    id: string;
    won: boolean;
    rewardTitle: string | null;
    rewardDescription: string | null;
    rewardImageUrl: string | null;
  } | null>(null);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [stampData, setStampData] = useState({
    currentStamps: 0,
    totalStamps: 10,
    restaurantName: "",
    restaurantSlug: "",
    restaurantId: "",
  });

  const { processQRScan, isProcessing } = useScanLogic();
  const { preloadLocation, getCachedLocation, requestLocationWithRetry, loading: locationLoading } = useGeolocation();

  // Check if location is enabled and preload on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationEnabled(false);
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      const isGranted = permission.state === 'granted';
      const isPrompt = permission.state === 'prompt';

      setLocationEnabled(isGranted || isPrompt);

      // If already granted, preload location in background
      if (isGranted) {
        console.log("Location already granted, preloading...");
        preloadLocation();
      }

      permission.addEventListener('change', () => {
        console.log('Location permission changed:', permission.state);
        const newGranted = permission.state === 'granted';
        setLocationEnabled(newGranted || permission.state === 'prompt');

        // When permission is granted, preload location immediately
        if (newGranted) {
          console.log("Permission just granted, preloading location...");
          preloadLocation();
        }
      });
    } catch {
      // Fallback: assume location might be available
      setLocationEnabled(true);
    }
  };

  // Request and preload location proactively
  const requestLocationPermission = async () => {
    setIsPreloadingLocation(true);

    try {
      // Use higher retry count for manual click
      const location = await requestLocationWithRetry(3);
      if (location) {
        setLocationEnabled(true);
        toast.success("Location enabled! You can now scan.");
      } else {
        // Don't show toast error here, use the UI state
        setLocationEnabled(false);
      }
    } catch (error) {
      console.error("Location permission error:", error);
      setLocationEnabled(false);
    } finally {
      setIsPreloadingLocation(false);
    }
  };

  const stopScanLoop = useCallback(() => {
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
  }, []);

  const extractRestaurantId = useCallback((qrData: string): string | null => {
    // Expected QR: https://druto.in/scan/<restaurantId>
    try {
      const url = new URL(qrData);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("scan");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    } catch {
      // Not a URL
    }

    const match = qrData.match(/\/scan\/([0-9a-fA-F-]{36})/);
    if (match?.[1]) return match[1];

    if (/^[0-9a-fA-F-]{36}$/.test(qrData)) return qrData;

    return null;
  }, []);
  // If restaurantId is in URL, ensure user is authenticated then process scan immediately
  useEffect(() => {
    if (!restaurantId) return;

    const authData = localStorage.getItem("druto_auth");
    if (!authData) {
      navigate(`/auth?redirect=${encodeURIComponent(`/scan/${restaurantId}`)}`);
      return;
    }

    processScan(restaurantId);
  }, [restaurantId, navigate]);

  const startCamera = async () => {
    // If location is not yet granted, try to trigger the prompt in parallel
    if (locationEnabled === null || locationEnabled === false) {
      console.log("Triggering location prompt as camera starts...");
      preloadLocation();
    }

    try {
      hasProcessedRef.current = false;

      // Request camera with high resolution and environment focus
      const constraints: any = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      setStream(mediaStream);
      setScanState("scanning");

      // Wait for next tick to ensure videoRef is ready
      setTimeout(() => {
        if (!videoRef.current) return;

        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.error);

        const tick = () => {
          if (hasProcessedRef.current) return;
          if (!videoRef.current || !canvasRef.current) {
            scanRafRef.current = requestAnimationFrame(tick);
            return;
          }

          const video = videoRef.current;
          if (video.readyState < 2) {
            scanRafRef.current = requestAnimationFrame(tick);
            return;
          }

          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            scanRafRef.current = requestAnimationFrame(tick);
            return;
          }

          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          // Optimization: scan almost the full height/width for better user experience
          const scanAreaSize = Math.min(videoWidth, videoHeight) * 0.9;
          const sx = (videoWidth - scanAreaSize) / 2;
          const sy = (videoHeight - scanAreaSize) / 2;

          canvas.width = scanAreaSize;
          canvas.height = scanAreaSize;

          ctx.drawImage(video, sx, sy, scanAreaSize, scanAreaSize, 0, 0, scanAreaSize, scanAreaSize);
          const imageData = ctx.getImageData(0, 0, scanAreaSize, scanAreaSize);

          // We use attemptBoth because many QR codes might be inverted or the lighting might be weird
          const code = jsQR(imageData.data, scanAreaSize, scanAreaSize, { 
            inversionAttempts: "attemptBoth" 
          });

          if (code?.data) {
            const extracted = extractRestaurantId(code.data);
            if (extracted) {
              hasProcessedRef.current = true;
              stopScanLoop();
              processScan(extracted);
              return;
            } else {
              // If we see a QR but it's not ours, we still wait a bit to avoid toast spam
              console.log("Found QR but not a Druto ID:", code.data);
            }
          }

          scanRafRef.current = requestAnimationFrame(tick);
        };

        stopScanLoop();
        scanRafRef.current = requestAnimationFrame(tick);
      }, 100);
    } catch (err: any) {
      console.error("Camera error:", err);
      setHasCamera(false);
      if (err.name === "NotAllowedError") {
        toast.error("Camera access denied. Please enable camera permissions in your browser settings.");
      } else if (err.name === "NotFoundError") {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not access camera: " + err.message);
      }
    }
  };

  const stopCamera = useCallback(() => {
    stopScanLoop();

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream, stopScanLoop]);

  useEffect(() => {
    return () => {
      stopScanLoop();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream, stopScanLoop]);

  useEffect(() => {
    if (scanState !== "pending-approval" || !currentScanId) return;

    console.log("Subscribing to scan approval for:", currentScanId);
    const channel = supabase
      .channel(`scan_approval_${currentScanId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scans",
          filter: `id=eq.${currentScanId}`,
        },
        async (payload) => {
          console.log("Scan update detected:", payload);
          if (payload.new.staff_approved === true) {
            console.log("Scan APPROVED! Transitioning to success...");
            
            // 1. Fetch scratch card result if any
            const { data: scratchData } = await supabase
              .from("scratch_card_results")
              .select("*")
              .eq("scan_id", currentScanId)
              .maybeSingle();

            if (scratchData) {
              setScratchCardData({
                id: scratchData.id,
                won: scratchData.won,
                rewardTitle: scratchData.reward_title,
                rewardDescription: scratchData.reward_description,
                rewardImageUrl: scratchData.reward_image_url,
              });
            }

            // 2. Refresh data
            queryClient.invalidateQueries({ queryKey: ['restaurant-detail'] });
            queryClient.invalidateQueries({ queryKey: ['customer-data'] });

            // 3. Update stamp count (optimistic +1)
            setStampData(prev => ({
              ...prev,
              currentStamps: prev.currentStamps + 1
            }));

            // 4. Show success!
            setScanState("success");
            setShowStampAnimation(true);
            toast.success("Visit approved by staff! 🎉");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scanState, currentScanId, queryClient]);

  const processScan = async (restId: string, staffApproved = false) => {
    const authData = localStorage.getItem("druto_auth");
    if (!authData) {
      toast.info("Please log in to record your visit");
      navigate(`/auth?redirect=${encodeURIComponent(`/scan/${restId}`)}`);
      return;
    }

    setScanState("verifying-location");
    setLocationError(null);

    const result = await processQRScan(restId, { staffApproved });

    if (!result.success && result.error === "Not authenticated") {
      toast.info("Please log in to record your visit");
      navigate(`/auth?redirect=${encodeURIComponent(`/scan/${restId}`)}`);
      return;
    }

    if (result.success) {
      // Check if this is a pending approval (no stamp added yet)
      if (result.pendingApproval) {
        setStampData({
          currentStamps: result.currentStamps || 0,
          totalStamps: result.totalStamps || 10,
          restaurantName: result.restaurantName || "Business",
          restaurantSlug: result.restaurantSlug || "",
          restaurantId: result.restaurantId || restId,
        });
        setScanState("pending-approval");
        setCurrentScanId(result.scanId || null);
        stopCamera();
        return;
      }

      // Auto-approved scan
      setCurrentScanId(result.scanId || null);
      queryClient.invalidateQueries({ queryKey: ['restaurant-detail'] });
      queryClient.invalidateQueries({ queryKey: ['customer-data'] });

      setStampData({
        currentStamps: result.currentStamps || 0,
        totalStamps: result.totalStamps || 10,
        restaurantName: result.restaurantName || "Business",
        restaurantSlug: result.restaurantSlug || "",
        restaurantId: result.restaurantId || restId,
      });
      // Store scratch card data if present
      if (result.scratchCard) {
        setScratchCardData(result.scratchCard);
      }
      setShowStampAnimation(true);
      setScanState("success");
      stopCamera();
    } else if (result.alreadyScannedToday) {
      setStampData((prev) => ({
        ...prev,
        restaurantName: result.restaurantName || "Business",
        restaurantSlug: result.restaurantSlug || "",
        restaurantId: result.restaurantId || restId,
      }));
      setScanState("already-scanned");
    } else if (result.loyaltyPaused) {
      setStampData((prev) => ({
        ...prev,
        restaurantName: result.restaurantName || "Business",
      }));
      setScanState("loyalty-paused");
      stopCamera();
    } else if (result.locationRetryable || result.tooFarFromRestaurant || !result.success) {
      // Any other failure (location, distance, or general error) leads to Manual Verification
      setLocationError(result.error);
      setPendingScanRestaurantId(restId);
      
      // Ensure we have the restaurant name for the scratch card check later
      if (result.restaurantName) {
        setStampData(prev => ({
          ...prev,
          restaurantName: result.restaurantName || "Business",
          restaurantId: result.restaurantId || restId,
        }));
      }
      
      setScanState("manual-verification");
    }
  };

  const handleStampAnimationComplete = useCallback(() => {
    setShowStampAnimation(false);

    // If scratch card data is available, show scratch card before navigating
    if (scratchCardData) {
      setShowScratchCard(true);
      return;
    }

    // Navigate using slug to avoid UUID→slug redirect in RestaurantDetail
    navigateToRestaurant();
  }, [scratchCardData]);

  const navigateToRestaurant = useCallback(() => {
    const slug = stampData.restaurantSlug || stampData.restaurantId;
    
    // CRITICAL: Clear both React Query cache AND localStorage cache 
    // to prevent showing stale "0 stamps" state during transition
    const cacheKey = `restaurant_${slug}`;
    localStorage.removeItem(`druto_cache_${cacheKey}`);
    queryClient.invalidateQueries({ queryKey: ['restaurant-detail', slug] });
    queryClient.invalidateQueries({ queryKey: ['customer-data'] });
    queryClient.invalidateQueries({ queryKey: ['rewards-data'] });
    
    navigate(`/restaurant/${slug}`, {
      state: { justScanned: true, stampNumber: stampData.currentStamps }
    });
  }, [navigate, queryClient, stampData.restaurantSlug, stampData.restaurantId, stampData.currentStamps]);

  const handleScratchCardComplete = useCallback(() => {
    setShowScratchCard(false);
    setScratchCardData(null);
    navigateToRestaurant();
  }, [navigateToRestaurant]);

  const resetScan = () => {
    hasProcessedRef.current = false;
    setScanState("ready");
    setLocationError(null);
    setPendingScanRestaurantId(null);
    stopCamera();
  };

  const retryWithFreshLocation = async () => {
    const restId = pendingScanRestaurantId || restaurantId;
    if (!restId) {
      toast.error("No restaurant to scan");
      return;
    }

    console.log("Retrying scan with fresh location...");
    setScanState("acquiring-location");

    const location = await requestLocationWithRetry(3);
    if (location) {
      await processScan(restId);
    } else {
      setLocationError("Still could not get location. Please check GPS settings.");
      setScanState("location-error");
    }
  };

  const requestStaffApproval = () => {
    const restId = pendingScanRestaurantId || restaurantId;
    if (restId) {
      // Create a PENDING scan for owner approval — do NOT auto-approve
      processScanAsPending(restId);
    } else {
      toast.info("Ask staff to enter approval code");
      resetScan();
    }
  };

  const processScanAsPending = async (restId: string) => {
    const authData = localStorage.getItem("druto_auth");
    if (!authData) {
      toast.info("Please log in to record your visit");
      navigate(`/auth?redirect=${encodeURIComponent(`/scan/${restId}`)}`);
      return;
    }

    setScanState("verifying-location");
    setLocationError(null);

    const result = await processQRScan(restId, { requestPending: true });

    if (result.success) {
      setStampData({
        currentStamps: result.currentStamps || 0,
        totalStamps: result.totalStamps || 10,
        restaurantName: result.restaurantName || "Business",
        restaurantSlug: result.restaurantSlug || "",
        restaurantId: result.restaurantId || restId,
      });
      setScanState("pending-approval");
      setCurrentScanId(result.scanId || null);
      stopCamera();
    } else if (result.alreadyScannedToday) {
      setStampData((prev) => ({
        ...prev,
        restaurantName: result.restaurantName || "Business",
        restaurantSlug: result.restaurantSlug || "",
        restaurantId: result.restaurantId || restId,
      }));
      setScanState("already-scanned");
    } else {
      setLocationError(result.error || "Something went wrong");
      setScanState("manual-verification"); // Use the unified verification screen as fallback
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Stamp Success Animation Overlay */}
      <StampSuccessAnimation
        isVisible={showStampAnimation}
        currentStamps={stampData.currentStamps}
        totalStamps={stampData.totalStamps}
        restaurantName={stampData.restaurantName}
        onComplete={handleStampAnimationComplete}
      />

      {/* Scratch Card Overlay — shows after stamp animation if scratch card data exists */}
      {showScratchCard && scratchCardData && stampData.restaurantName?.toLowerCase().includes("borcella") && (
        <ScratchCard
          isVisible={showScratchCard}
          scratchData={scratchCardData}
          restaurantName={stampData.restaurantName}
          onComplete={handleScratchCardComplete}
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[60] flex items-center justify-between p-4 pt-[env(safe-area-inset-top,1rem)] pointer-events-none">
        <button
          onClick={() => navigate("/dashboard")}
          className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg pointer-events-auto"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Scan QR Code</h1>
        <button
          onClick={() => setFlashOn(!flashOn)}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-colors pointer-events-auto",
            flashOn ? "bg-primary text-primary-foreground" : "bg-card/90 backdrop-blur-sm"
          )}
        >
          <Flashlight className="h-5 w-5" />
        </button>
      </div>

      {/* Camera View */}
      <div className="relative h-[100dvh] h-screen">
        {scanState === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-8">
            <div className="mb-8 h-32 w-32 rounded-3xl gradient-primary flex items-center justify-center animate-pulse-glow">
              <QrCode className="h-16 w-16 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Ready to Scan</h2>
            <p className="text-center text-muted-foreground mb-4">
              Point your camera at the QR code to earn a visit
            </p>

            {/* Location status indicator */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium",
              locationEnabled === true ? "bg-green-500/10 text-green-600" :
                locationEnabled === false ? "bg-destructive/10 text-destructive" :
                  "bg-muted-foreground/10 text-muted-foreground"
            )}>
              {locationEnabled === null ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking location...
                </>
              ) : locationEnabled ? (
                <>
                  <MapPin className="h-4 w-4" />
                  Location enabled
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Location disabled
                </>
              )}
            </div>

            <div className="w-full max-w-xs space-y-3">
              {locationEnabled === false ? (
                <>
                  <p className="text-sm text-center text-muted-foreground mb-2">
                    Location is required to verify you're at the business. Please enable GPS.
                  </p>
                  <Button
                    className="w-full h-14 text-lg"
                    variant="hero"
                    onClick={requestLocationPermission}
                    disabled={isPreloadingLocation}
                  >
                    {isPreloadingLocation ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Enabling...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-5 w-5 mr-2" />
                        Enable Location
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost" 
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={startCamera}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Open Camera Anyway
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full h-14 text-lg"
                  variant="hero"
                  onClick={startCamera}
                  disabled={locationEnabled === null}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
              )}

              {restaurantId && locationEnabled && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => processScan(restaurantId)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  Record Visit
                </Button>
              )}
            </div>

            {!hasCamera && (
              <p className="mt-4 text-sm text-destructive text-center">
                Camera access denied. Please enable camera permissions in your browser settings.
              </p>
            )}
          </div>
        )}

        {scanState === "scanning" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Clear overlay without brackets/lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-64 w-64 relative opacity-40">
                {/* Subtle outer glow instead of brackets */}
                <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 bg-primary/5 animate-pulse" />
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-32 left-0 right-0 text-center px-4">
              <div className="inline-flex flex-col items-center gap-2 rounded-2xl bg-card/90 backdrop-blur-sm px-6 py-3">
                {locationEnabled && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location enabled - must be within 15m of the business
                  </p>
                )}
              </div>

              {/* Manual entry and Staff Help buttons for when QR not scanning/camera open */}
              <div className="flex flex-col gap-2 mt-4 items-center">
                {restaurantId && (
                  <Button
                    variant="outline"
                    className="w-full bg-card/90 backdrop-blur-sm h-12"
                    onClick={() => processScan(restaurantId)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Record Visit Manually
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {scanState === "verifying-location" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8">
            <div className="mb-6 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Verifying Location...</h2>
            <p className="text-center text-muted-foreground mb-4">
              Checking if you're at the business (within 15m)
            </p>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {scanState === "acquiring-location" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8">
            <div className="mb-6 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Getting Your Location...</h2>
            <p className="text-center text-muted-foreground mb-4">
              Please allow location access if prompted
            </p>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground mt-4">
              This may take a few seconds on first use
            </p>
          </div>
        )}

        {scanState === "manual-verification" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8 animate-in fade-in zoom-in duration-300">
            <div className="mb-6 h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Clock className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Verify Your Visit</h2>
            <div className="bg-card/50 backdrop-blur-md border border-border rounded-xl p-4 mb-6 max-w-sm w-full">
              <p className="text-center text-muted-foreground text-sm leading-relaxed">
                We're almost done! Please ask a staff member for help to approve your stamp manually.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <Button
                onClick={requestStaffApproval}
                variant="hero"
                className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
              >
                <CheckCircle2 className="h-5 w-5 mr-3 text-white" />
                Request Staff Approval
              </Button>
              <Button
                onClick={resetScan}
                variant="outline"
                className="w-full h-12"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Scanning Again
              </Button>
              <Button onClick={() => navigate("/dashboard")} variant="ghost" className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {scanState === "success" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8">
            <div className="mb-6 h-24 w-24 rounded-full bg-green-500 flex items-center justify-center animate-stamp">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Visit Recorded! 🎉</h2>
            <p className="text-center text-muted-foreground mb-2">
              +1 stamp earned at {stampData.restaurantName}
            </p>
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold">
                {stampData.currentStamps}/{stampData.totalStamps} stamps - {stampData.totalStamps - stampData.currentStamps > 0 ? `${stampData.totalStamps - stampData.currentStamps} more for reward!` : "Reward earned!"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        )}

        {scanState === "pending-approval" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8 text-center">
            <div className="mb-6 h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Clock className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Awaiting Approval</h2>
            <div className="bg-card/50 backdrop-blur-md border border-border rounded-xl p-6 mb-8 max-w-sm w-full">
              <p className="text-muted-foreground text-[15px] leading-relaxed mb-4">
                Your visit to <span className="font-bold text-foreground">{stampData.restaurantName}</span> is recorded.
              </p>
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for staff to approve...</span>
              </div>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <p className="text-xs text-muted-foreground mb-4">
                You can wait here, or check back later. Your reward will appear in your profile once approved.
              </p>
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12">
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        {scanState === "already-scanned" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8">
            <div className="mb-6 h-24 w-24 rounded-full bg-accent flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-accent-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Already Scanned Today</h2>
            <p className="text-center text-muted-foreground mb-6">
              You can only scan once per day at {stampData.restaurantName}. Come back tomorrow!
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Fallback for legacy error states or unexpected errors */}
        {(scanState === "error" || scanState === "location-error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8">
            <div className="mb-6 h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center relative">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Clock className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Verify Your Visit</h2>
            <div className="bg-card/50 backdrop-blur-md border border-border rounded-xl p-4 mb-6 max-w-sm w-full">
              <p className="text-center text-muted-foreground text-sm leading-relaxed">
                {locationError || "We're having trouble verifying your location automatically. Please ask staff for help."}
              </p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <Button
                onClick={requestStaffApproval}
                variant="hero"
                className="w-full h-14 text-lg font-bold"
              >
                <CheckCircle2 className="h-5 w-5 mr-3 text-white" />
                Request Staff Approval
              </Button>
              <Button onClick={resetScan} variant="outline" className="w-full h-12">
                Try Scanning Again
              </Button>
            </div>
          </div>
        )}

        {scanState === "loyalty-paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8">
            <div className="mb-6 h-24 w-24 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Program Paused</h2>
            <p className="text-center text-muted-foreground mb-2 max-w-sm">
              The loyalty program at <span className="font-semibold text-foreground">{stampData.restaurantName}</span> is currently paused.
            </p>
            <p className="text-center text-muted-foreground text-sm mb-6 max-w-sm">
              Don't worry — your stamps are saved! Check back later when the program is active again.
            </p>
            <div className="w-full max-w-xs space-y-3">
              <Button onClick={() => navigate("/dashboard")} variant="hero" className="w-full">
                Back to Dashboard
              </Button>
              <Button onClick={resetScan} variant="outline" className="w-full">
                Scan Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
