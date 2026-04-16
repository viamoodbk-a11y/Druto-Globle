import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState, useCallback } from "react";
import { ToastAndroid, Platform, Alert, Linking, NativeModules } from "react-native";
// import RazorpayCheckout from "react-native-razorpay"; // Removed to prevent crashing in Expo Go
import { supabase } from "../lib/supabase";

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
}

export const useRazorpayCheckout = () => {
    const [isLoading, setIsLoading] = useState(false);

    const showToast = (title: string, message?: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(`${title}: ${message || ''}`, ToastAndroid.LONG);
        } else {
            Alert.alert(title, message || '');
        }
    };

    const verifyPayment = async (
        razorpay_payment_id: string,
        razorpay_subscription_id: string,
        razorpay_signature: string,
    ): Promise<boolean> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-razorpay-payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    razorpay_payment_id,
                    razorpay_subscription_id,
                    razorpay_signature,
                }),
            });

            const data = await response.json();
            return data?.verified === true;
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
                // Get auth session
                const { data: session } = await supabase.auth.getSession();
                if (!session?.session) {
                    showToast("Error", "Please log in to subscribe");
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
                const response = await fetch(
                    `${SUPABASE_FUNCTIONS_URL}/razorpay-create-subscription`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            apikey: ANON_KEY,
                            Authorization: `Bearer ${session.session.access_token}`,
                        },
                        body: JSON.stringify({ userId, restaurantId, planTier: planTier || "starter" }),
                    }
                );

                const result = await response.json();

                if (!response.ok || result?.error) {
                    const errorMsg = result?.error || "Failed to create subscription";
                    showToast("Error", errorMsg);
                    setIsLoading(false);
                    return { success: false };
                }

                const { subscriptionId, keyId } = result;

                if (!subscriptionId || !keyId) {
                    showToast("Error", "Invalid response from payment server");
                    setIsLoading(false);
                    return { success: false };
                }

                const options = {
                    key: keyId,
                    subscription_id: subscriptionId,
                    name: "Druto",
                    description: planTier === "pro" ? "Druto Pro — ₹999/month" : planTier === "growth" ? "Druto Growth — ₹499/month" : "Druto Starter — ₹229/month",
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
                        color: "#900A12", // App Primary Color
                    },
                };

                // Open native Razorpay checkout
                return new Promise<{ success: boolean }>((resolve) => {
                    const RazorpayCheckout = require('react-native-razorpay').default;

                    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                        showToast("Native Module Missing", "Razorpay is not supported in Expo Go. Please use a Development Build.");
                        setIsLoading(false);
                        return resolve({ success: false });
                    }

                    RazorpayCheckout.open(options)
                        .then(async (data: RazorpayResponse) => {
                            console.log("Payment response received:", data);

                            // Verify the payment signature
                            const verified = await verifyPayment(
                                data.razorpay_payment_id,
                                data.razorpay_subscription_id,
                                data.razorpay_signature,
                            );

                            if (verified) {
                                showToast("Payment Successful! 🎉", "Your subscription is now active");
                                setIsLoading(false);
                                resolve({ success: true });
                            } else {
                                showToast("Verification Failed", "Payment received but verification failed. Please contact support.");
                                setIsLoading(false);
                                resolve({ success: false });
                            }
                        })
                        .catch((error: any) => {
                            console.error("Payment failed:", error);
                            showToast("Payment Failed", error.description || "Please try again or use a different payment method");
                            setIsLoading(false);
                            resolve({ success: false });
                        });
                });
            } catch (error: any) {
                console.error("Subscription error:", error);
                showToast("Error", error.message || "Failed to initiate payment");
                setIsLoading(false);
                return { success: false };
            }
        },
        []
    );

    return {
        initiateSubscription,
        isLoading,
    };
};
