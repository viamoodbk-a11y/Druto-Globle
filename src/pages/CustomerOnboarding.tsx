import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import drutoLogo from "@/assets/druto-logo.png";
import { cn } from "@/lib/utils";

const customerSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

const CustomerOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string }>({});

  const handleSubmit = async () => {
    // Validate input
    const result = customerSchema.safeParse({ fullName });
    if (!result.success) {
      const fieldErrors: { fullName?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "fullName") fieldErrors.fullName = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // Get auth info from localStorage
      const authData = localStorage.getItem("druto_auth");
      if (!authData) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const parsedAuth = JSON.parse(authData);
      const userId = parsedAuth.userId || parsedAuth.user_id || parsedAuth.session?.user?.id || parsedAuth.user?.id;

      if (!userId) {
        throw new Error("User ID is required");
      }

      // Update profile via edge function
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
            fullName: fullName.trim(),
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update localStorage
      const updatedAuth = {
        ...JSON.parse(authData),
        profile: { full_name: fullName.trim() },
        onboardingComplete: true,
      };
      localStorage.setItem("druto_auth", JSON.stringify(updatedAuth));

      // Success toast removed (keep UX quiet)

      const postAuthRedirect = localStorage.getItem("druto_post_auth_redirect");
      if (postAuthRedirect) {
        localStorage.removeItem("druto_post_auth_redirect");
        navigate(postAuthRedirect);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "Error saving profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-background dark:to-background flex flex-col">
      {/* Progress indicator */}
      <div className="px-6 pt-8">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div className="h-1 w-2 rounded-full bg-muted" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-8">
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-3">
              What should we call you? 👋
            </h1>
            <p className="text-muted-foreground">
              Just your name – that's all we need to get you started!
            </p>
          </div>

          {/* Error display */}
          {errors.fullName && (
            <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive text-center">{errors.fullName}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Your Name</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="h-5 w-5" />
                </span>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-14 text-lg pl-12 tracking-wide rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
                  maxLength={100}
                  autoFocus
                />
              </div>
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full h-14 text-base rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleSubmit}
              disabled={isLoading || fullName.trim().length < 2}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Let's Go!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Bottom section with Logo */}
        <div className="w-full max-w-sm mx-auto mt-8">
          <div className="flex justify-center">
            <img src={drutoLogo} alt="Druto" className="h-8 w-auto opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOnboarding;
