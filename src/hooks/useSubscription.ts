import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanTier = "starter" | "growth" | "pro" | "enterprise";

const TIER_BRANCH_LIMITS: Record<PlanTier, number> = {
  starter: 1,
  growth: 3,
  pro: 6,
  enterprise: 999,
};

interface SubscriptionData {
  isActive: boolean;
  isTrialing: boolean;
  trialEnd: string | null;
  trialDaysLeft: number | null;
  status: string | null;
  planTier: PlanTier;
  maxBranches: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSubscription = (): SubscriptionData => {
  const { user, role } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier>("starter");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user || role !== "restaurant_owner") {
      setIsActive(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("subscriptions")
        .select("status, trial_end, plan_tier, razorpay_plan_id, admin_override")
        .eq("user_id", user.id)
        .order("status", { ascending: true }) // 'active' comes before 'cancelled' or 'expired' alphabetically or we can order by created_at
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        console.error("Subscription query error:", queryError);
        setError(queryError.message);
        setIsActive(false);
        setStatus(null);
      } else if (data) {
        const isTrial = data.status === "trialing" && data.trial_end && new Date(data.trial_end) > new Date();
        const isAdminOverride = !!data.admin_override;

        setIsActive(data.status === "active" || !!isTrial || isAdminOverride);
        setIsTrialing(!!isTrial);
        setTrialEnd(data.trial_end || null);
        setStatus(isAdminOverride ? "Admin Access" : data.status);

        let tier = (data as any).plan_tier?.toLowerCase();
        if (!tier && data.razorpay_plan_id) {
          const mapping: Record<string, PlanTier> = {
            "plan_SJaiNbYPVZ4EAW": "starter",
            "plan_SJajOqY647gBDb": "growth",
            "plan_SJaqry4l3WDOzd": "pro"
          };
          tier = mapping[data.razorpay_plan_id];
        }

        // Grant pro features during trial or admin override if not explicitly set
        if (isTrial || (isAdminOverride && !tier)) {
          tier = "pro";
        }

        setPlanTier(tier || "starter");
      } else {
        setIsActive(false);
        setStatus(null);
      }
    } catch (err: any) {
      console.error("Error fetching subscription:", err);
      setError(err.message);
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (!user || role !== "restaurant_owner") return;

    const channel = supabase
      .channel(`subscription-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log("Subscription change detected via realtime");
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, fetchSubscription]);

  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    isActive,
    isTrialing,
    trialEnd,
    trialDaysLeft,
    status,
    planTier,
    maxBranches: TIER_BRANCH_LIMITS[planTier],
    isLoading,
    error,
    refetch: fetchSubscription,
  };
};