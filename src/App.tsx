import { Suspense, lazy, memo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { DrutoLoader } from "./components/DrutoLoader";
import { RoleGuard } from "@/components/RoleGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";

// Eager-loaded routes
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Eager-load layouts to avoid "Component is not a function" error
import { MainLayout } from "./components/layouts/MainLayout";
import { OwnerLayout } from "./components/layouts/OwnerLayout";

// Eager-load high-traffic customer pages for instant first load
import CustomerDashboard from "./pages/CustomerDashboard";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import Rewards from "./pages/Rewards";
import RestaurantDetail from "./pages/RestaurantDetail";

// Lazy-loaded routes for less frequent pages
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const OwnerProfile = lazy(() => import("./pages/OwnerProfile"));
const OwnerSettings = lazy(() => import("./pages/owner/OwnerSettings"));
const Scanner = lazy(() => import("./pages/Scanner"));
const CustomerOnboarding = lazy(() => import("./pages/CustomerOnboarding"));
const OwnerOnboarding = lazy(() => import("./pages/OwnerOnboarding"));
const Settings = lazy(() => import("./pages/Settings"));
const Legal = lazy(() => import("./pages/Legal"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DirectPayment = lazy(() => import("./pages/DirectPayment"));
const InstallApp = lazy(() => import("./pages/InstallApp"));

// Configure React Query with optimal caching for SPA performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - don't refetch if data is fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnMount: true, // Refetch stale data on mount to prevent blank pages
      retry: (failureCount, error) => {
        // Retry auth errors up to 3 times (auth may not be ready yet)
        const msg = (error as Error)?.message || "";
        if (msg.includes("Not authenticated") || msg.includes("Malformed auth")) {
          return failureCount < 3;
        }
        return failureCount < 1; // Single retry for other errors
      },
      retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
    },
  },
});

function App() {
  // Detects new deploys every 5 min and shows 'Update Now' toast
  useAutoUpdate();
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <AuthProvider>
              <Suspense fallback={<DrutoLoader message="Getting your rewards ready..." />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/pay/:tier" element={<DirectPayment />} />
                  <Route path="/pay" element={<DirectPayment />} />
                  <Route path="/install" element={<InstallApp />} />


                  {/* Onboarding routes (need auth but no role guard) */}
                  <Route path="/onboarding/customer" element={<CustomerOnboarding />} />
                  <Route path="/onboarding/owner" element={<OwnerOnboarding />} />

                  {/* Customer routes with persistent layout */}
                  <Route
                    element={
                      <RoleGuard allowedRoles={["customer"]}>
                        <MainLayout />
                      </RoleGuard>
                    }
                  >
                    <Route path="/dashboard" element={<CustomerDashboard />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/restaurant/:slug" element={<RestaurantDetail />} />
                    <Route path="/scan/:restaurantId" element={<Scanner />} />
                    <Route path="/scan" element={<Scanner />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/rewards" element={<Rewards />} />
                  </Route>

                  {/* Owner routes with persistent layout */}
                  <Route
                    element={
                      <RoleGuard allowedRoles={["restaurant_owner"]}>
                        <OwnerLayout />
                      </RoleGuard>
                    }
                  >
                    <Route
                      path="/owner"
                      element={
                        <Suspense fallback={<DashboardSkeleton type="owner" />}>
                          <OwnerDashboard />
                        </Suspense>
                      }
                    />
                    <Route path="/owner/profile" element={<OwnerProfile />} />
                    <Route path="/owner/settings" element={<OwnerSettings />} />
                  </Route>

                  {/* Admin routes (no persistent layout needed) */}
                  <Route
                    path="/admin"
                    element={
                      <RoleGuard allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </RoleGuard>
                    }
                  />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>

      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
