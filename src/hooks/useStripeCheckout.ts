import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Integration for Stripe Checkout
export const useStripeCheckout = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const initiateSubscription = useCallback(
    async (
      userId: string,
      restaurantId?: string,
      userDetails?: { name?: string; email?: string },
      planTier?: string
    ) => {
      setIsLoading(true);

      try {
        // Create Stripe checkout session via edge function
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "stripe-create-checkout",
          {
            body: { 
              userId, 
              restaurantId, 
              planTier: planTier || "starter",
              email: userDetails?.email,
              successUrl: `${window.location.origin}/owner/settings?payment=success`,
              cancelUrl: `${window.location.origin}/owner/settings?payment=cancelled`
            },
          }
        );

        if (fnError || result?.error) {
          const errorMsg = result?.error || fnError?.message || "Failed to create checkout session";
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false };
        }

        const { url } = result;

        if (!url) {
          toast({
            title: "Error",
            description: "Invalid response from stripe gateway",
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false };
        }

        // Redirect to Stripe Checkout page
        window.location.href = url;
        
        return { success: true };
      } catch (error: any) {
        console.error("Subscription error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to initiate payment",
          variant: "destructive",
        });
        setIsLoading(false);
        return { success: false };
      }
    },
    [toast]
  );

  return {
    initiateSubscription,
    isLoading,
  };
};
