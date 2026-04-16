import { Button } from '@/components/ui/button';
import { Download, Share, Plus, Smartphone, Check, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import drutoLogo from "@/assets/druto-logo-gift.png";

const InstallApp = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall, showIOSInstall, isAndroid } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setInstallSuccess(true);
    }
  };

  if (isInstalled || installSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-lg shadow-green-200">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Successfully Installed!</h1>
        <p className="text-muted-foreground mb-8">
          Druto is now on your home screen. Open it from there to manage your rewards!
        </p>
        <Button onClick={() => navigate('/explore')} variant="hero" className="w-full max-w-xs h-12 rounded-xl">
          Go to Rewards
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 md:pt-20">
      <div className="mb-8 text-center">
        <img src={drutoLogo} alt="Druto" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Install Druto Rewards</h1>
        <p className="text-muted-foreground text-lg max-w-xs mx-auto">
          Get faster access to your stamps and favorite rewards
        </p>
      </div>

      <div className="w-full max-w-md bg-card rounded-[32px] p-6 shadow-card border border-border">
        {/* Android / Desktop Install */}
        {!showIOSInstall && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-foreground">One-Tap Install</h3>
                <p className="text-sm text-muted-foreground">For Android & Chrome</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-2xl leading-relaxed">
              Druto is a Progressive Web App. Install it once to use it like any other app on your phone. No App Store needed!
            </p>

            {isInstallable ? (
              <Button 
                onClick={handleInstall}
                className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download className="mr-2 h-5 w-5" />
                INSTALL NOW
              </Button>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium">
                Tap the three dots (⋮) in your browser and select "Install App" or "Add to Home Screen".
              </div>
            )}
          </div>
        )}

        {/* iOS Instructions */}
        {showIOSInstall && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
                <Share className="h-6 w-6 text-[#007AFF]" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-foreground">Install on iPhone</h3>
                <p className="text-sm text-muted-foreground">Follow these simple steps</p>
              </div>
            </div>

            <div className="space-y-6 text-left">
              <div className="flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white font-bold text-xs mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-foreground">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    In Safari, tap the <Share className="inline h-4 w-4 text-[#007AFF] mx-1" /> icon
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white font-bold text-xs mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-foreground">Choose "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Look for the <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-bold"><Plus className="h-3 w-3" /> Add to Home Screen</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white font-bold text-xs mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-foreground">Confirm and Save</p>
                  <p className="text-sm text-muted-foreground">
                    Tap "Add" in the top right corner. 
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-[11px] text-center text-muted-foreground font-medium uppercase tracking-wider">
                Works on all modern iPhones
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/explore')}
        className="mt-8 text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
      >
        Continue to Website <ArrowRight className="h-4 w-4" />
      </button>

      {/* Feature highlight */}
      <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-sm">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
            <Smartphone className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Fast Load</p>
        </div>
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Offline Access</p>
        </div>
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
            <Smartphone className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Push Alerts</p>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
