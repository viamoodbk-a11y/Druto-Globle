import { Button } from '@/components/ui/button';
import { Download, Share, X, Plus, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, promptInstall, showIOSInstall, isAndroid } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !showIOSInstall) return null;

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setDismissed(true);
    }
  };

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in">
        <div className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-10 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Install Druto on iPhone</h3>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Tap the Share button</p>
                <p className="text-sm text-muted-foreground mt-1">
                  At the bottom of Safari, tap the{' '}
                  <Share className="inline h-4 w-4 text-primary" /> share icon
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Scroll down and tap "Add to Home Screen"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Look for the{' '}
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                    <Plus className="h-3 w-3" /> Add to Home Screen
                  </span>{' '}
                  option
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Tap "Add" to confirm</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Druto will appear on your home screen like a real app!
                </p>
              </div>
            </div>
          </div>

          <Button 
            variant="hero" 
            className="w-full mt-8" 
            onClick={() => setShowIOSInstructions(false)}
          >
            Got it, I'll install now!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up md:left-auto md:right-4 md:max-w-sm">
      <div className="relative rounded-2xl bg-card p-4 shadow-card border border-border">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-2xl">🎁</span>
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-semibold text-foreground">Install Druto</h3>
            <p className="text-sm text-muted-foreground">
              Add to home screen for quick access
            </p>
          </div>
        </div>

        <div className="mt-3">
          {showIOSInstall ? (
            <Button className="w-full gradient-primary" onClick={() => setShowIOSInstructions(true)}>
              <Share className="mr-2 h-4 w-4" />
              Show me how
            </Button>
          ) : (
            <Button className="w-full gradient-primary" onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};