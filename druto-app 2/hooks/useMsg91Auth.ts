import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import * as SecureStore from 'expo-secure-store';

interface Msg91AuthState {
    isLoading: boolean;
    isOtpSent: boolean;
    error: string | null;
    resendTimer: number;
}

// User-provided credentials from configuration
const WIDGET_ID = "366275686570353935313730";
const AUTH_KEY = "485556T1e430nu6955ff3cP1";

export const useMsg91Auth = (userType: "customer" | "owner") => {
    const router = useRouter();
    const [state, setState] = useState<Msg91AuthState>({
        isLoading: false,
        isOtpSent: false,
        error: null,
        resendTimer: 0,
    });
    const [phone, setPhone] = useState("");
    const [requestId, setRequestId] = useState<string | null>(null);

    const authProcessingRef = useRef(false);

    // Resend timer
    useEffect(() => {
        let interval: any;
        if (state.resendTimer > 0) {
            interval = setInterval(() => {
                setState((prev) => ({ ...prev, resendTimer: prev.resendTimer - 1 }));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [state.resendTimer]);

    // Handle auth success - called after OTP is verified
    const handleAuthSuccess = useCallback(
        async (verifiedPhone: string, token: string = "verified") => {
            if (authProcessingRef.current) return;
            authProcessingRef.current = true;

            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                console.log("Calling msg91-auth for:", verifiedPhone, "UserType:", userType, "Token:", token);
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch(
                    `${SUPABASE_FUNCTIONS_URL}/msg91-auth`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            apikey: ANON_KEY,
                            Authorization: `Bearer ${ANON_KEY}`,
                        },
                        body: JSON.stringify({
                            phone: verifiedPhone,
                            token: token,
                            userType: userType,
                        }),
                    }
                );

                const result = await response.json();
                console.log("msg91-auth result:", result);

                if (result.error) throw new Error(result.error);

                const serverRole = result.role;

                // Optimized: Fire and forget the session setting and metadata updates
                if (result.session?.access_token) {
                    // Set session in background
                    supabase.auth.setSession({
                        access_token: result.session.access_token,
                        refresh_token: result.session.refresh_token,
                    }).catch(e => console.error("Mobile background session error:", e));

                    // Store expiry and prefetch in background
                    const expiry = Date.now() + (31536000 * 1000);
                    SecureStore.setItemAsync('druto_session_expiry', expiry.toString()).catch(() => { });

                    if (serverRole === 'customer') {
                        fetch(`${SUPABASE_FUNCTIONS_URL}/get-customer-data`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                apikey: ANON_KEY,
                                Authorization: `Bearer ${ANON_KEY}`,
                            },
                            body: JSON.stringify({ userId: result.user_id }),
                        }).catch(e => console.log("Prefetch error:", e));
                    }
                }

                // Determine redirect — handle both role string variants
                const isOwner = serverRole === 'restaurant_owner' || serverRole === 'owner' || result.has_restaurant;
                const redirectUrl = isOwner ? '/owner/dashboard' : '/(tabs)';
                console.log('Mobile auth fast-path — redirecting to:', redirectUrl);

                // Navigate immediately
                router.replace(redirectUrl as any);


            } catch (error: any) {
                authProcessingRef.current = false;
                setState((prev) => ({
                    ...prev,
                    error: error.message || "Authentication failed",
                    isLoading: false
                }));
            }
        },
        [userType, router]
    );

    const sendOtp = async (phoneNumber: string) => {
        const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
        if (cleanPhone.length < 10) {
            setState((prev) => ({ ...prev, error: "Invalid phone number" }));
            return;
        }

        setPhone(cleanPhone);
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log("Sending OTP to:", cleanPhone, "WidgetId:", WIDGET_ID);
            const response = await fetch(
                `https://api.msg91.com/api/v5/widget/sendOtp`,
                {
                    method: "POST",
                    headers: {
                        "authkey": AUTH_KEY,
                        "tokenAuth": AUTH_KEY,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify({
                        identifier: `91${cleanPhone}`,
                        mobile: `91${cleanPhone}`,
                        widgetId: WIDGET_ID
                    })
                }
            );

            const result = await response.json();
            console.log("raw sendOtp result:", result);

            if (result.type === "success") {
                setRequestId(result.message);
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    isOtpSent: true,
                    resendTimer: 30
                }));
            } else {
                throw new Error(result.message || "Failed to send OTP");
            }
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
        }
    };

    const verifyOtp = async (otp: string) => {
        if (!requestId) {
            setState((prev) => ({ ...prev, error: "Session expired. Please request a new OTP." }));
            return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log("Verifying OTP:", otp, "RequestId:", requestId);
            const response = await fetch(
                `https://api.msg91.com/api/v5/widget/verifyOtp`,
                {
                    method: "POST",
                    headers: {
                        "authkey": AUTH_KEY,
                        "tokenAuth": AUTH_KEY,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify({
                        otp: otp,
                        reqId: requestId,
                        requestId: requestId,
                        widgetId: WIDGET_ID
                    })
                }
            );

            const result = await response.json();
            console.log("raw verifyOtp result:", result);

            if (result.type === "success") {
                handleAuthSuccess(phone, result.message);
            } else {
                throw new Error(result.message || "Invalid OTP");
            }
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
        }
    };

    return {
        ...state,
        phone,
        sendOtp,
        verifyOtp,
        setPhone,
    };
};
