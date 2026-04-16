import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayError {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    confirm_close?: boolean;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      close: () => void;
      on: (event: string, callback: (response: { error: RazorpayError }) => void) => void;
    };
  }
}

// Hook for Razorpay checkout with multi-tier plan support
export const useRazorpayCheckout = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const verifyPayment = async (
    razorpay_payment_id: string,
    razorpay_subscription_id: string,
    razorpay_signature: string,
    accessToken: string
  ): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke("verify-razorpay-payment", {
        body: {
          razorpay_payment_id,
          razorpay_subscription_id,
          razorpay_signature,
        },
      });

      return response.data?.verified === true;
    } catch (error) {
      console.error("Payment verification error:", error);
      return false;
    }
  };

  const initiateSubscription = useCallback(
    async (
      userId: string,
      restaurantId?: string,
      userDetails?: { name?: string; email?: string; phone?: string },
      planTier?: string
    ) => {
      setIsLoading(true);

      try {
        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast({
            title: "Error",
            description: "Failed to load payment gateway. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false };
        }

        // Get auth session
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          toast({
            title: "Error",
            description: "Please log in to subscribe",
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false };
        }

        // Get user profile for prefill
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone_number")
          .eq("id", userId)
          .single();

        // Create subscription via edge function
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "razorpay-create-subscription",
          {
            body: { userId, restaurantId, planTier: planTier || "starter" },
          }
        );

        if (fnError || result?.error) {
          const errorMsg = result?.error || fnError?.message || "Failed to create subscription";
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false };
        }

        const { subscriptionId, keyId } = result;

        if (!subscriptionId || !keyId) {
          toast({
            title: "Error",
            description: "Invalid response from payment server",
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false };
        }

        // Open Razorpay checkout
        return new Promise<{ success: boolean }>((resolve) => {
          const options: RazorpayOptions = {
            key: keyId,
            subscription_id: subscriptionId,
            name: "Druto",
            description: planTier === "pro" ? "Druto Pro — ₹4999/year" : planTier === "growth" ? "Druto Growth — ₹2499/year" : "Druto Starter — ₹999/year",
            handler: async (response: RazorpayResponse) => {
              console.log("Payment response received:", response);

              // Verify the payment signature
              const verified = await verifyPayment(
                response.razorpay_payment_id,
                response.razorpay_subscription_id,
                response.razorpay_signature,
                session.session.access_token
              );

              if (verified) {
                toast({
                  title: "Payment Successful! 🎉",
                  description: "Your subscription is now active",
                });
                setIsLoading(false);
                resolve({ success: true });
              } else {
                toast({
                  title: "Verification Failed",
                  description: "Payment received but verification failed. Please contact support.",
                  variant: "destructive",
                });
                setIsLoading(false);
                resolve({ success: false });
              }
            },
            prefill: {
              name: userDetails?.name || profile?.full_name || "",
              email: userDetails?.email || profile?.email || "",
              contact: userDetails?.phone || profile?.phone_number || "",
            },
            notes: {
              user_id: userId,
              restaurant_id: restaurantId || "",
            },
            theme: {
              color: "#E53935",
            },
            modal: {
              ondismiss: () => {
                console.log("Payment modal closed by user");
                toast({
                  title: "Payment Cancelled",
                  description: "You can try again when ready",
                });
                setIsLoading(false);
                resolve({ success: false });
              },
              escape: true,
              confirm_close: true,
            },
          };

          const razorpay = new window.Razorpay(options);

          // Handle payment failures
          razorpay.on("payment.failed", (response: { error: RazorpayError }) => {
            console.error("Payment failed:", response.error);
            toast({
              title: "Payment Failed",
              description: response.error.description || "Please try again or use a different payment method",
              variant: "destructive",
            });
            setIsLoading(false);
            resolve({ success: false });
          });

          razorpay.open();
        });
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
