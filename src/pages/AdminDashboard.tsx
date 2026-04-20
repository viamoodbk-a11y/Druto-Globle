import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Store, Gift, QrCode, Trophy, TrendingUp, Loader2, ShieldCheck, 
  UserCog, Search, CreditCard, Clock, CheckCircle, XCircle, AlertTriangle, 
  MoreVertical, LogOut, Download, Trash2, Power, Phone, UserX, Sparkles, 
  Image as ImageIcon, Eye, MapPin, Hash, Activity, RefreshCw, Layers,
  QrCode as QrCodeIcon, Plus, Info,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DeleteUserModal } from "@/components/DeleteUserModal";
import { ModifyRolesModal } from "@/components/admin/ModifyRolesModal";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { BannerManagement } from "@/components/admin/BannerManagement";
import { OwnerPopupManagement } from "@/components/admin/OwnerPopupManagement";
import { ManualSubscriptionModal } from "@/components/ManualSubscriptionModal";
import { generateQRPoster, downloadBlob } from "@/lib/qrPosterGenerator";
import { AnalyticsChart } from "@/components/AnalyticsChart";

// --- PROFESSIONAL INTERFACES ---
interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  totalRewards: number;
  totalScans: number;
  totalClaimedRewards: number;
  activeCards: number;
}

interface UserWithRoles {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  roles: string[];
}

interface BusinessWithOwner {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  owner_name: string;
  owner_phone: string;
  owner_id: string;
  created_at: string;
  scan_count?: number;
}

interface SubscriptionWithDetails {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  status: string;
  plan_tier?: string;
  trial_start: string;
  trial_end: string;
  current_period_end?: string;
  admin_override: boolean | null;
  admin_notes: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
  restaurant_name?: string;
  owner_name?: string;
  owner_phone?: string;
}

interface RecentScan {
  id: string;
  scanned_at: string;
  user_name: string;
  user_phone: string;
  restaurant_name: string;
  location_verified?: boolean;
}

interface RecentClaim {
  id: string;
  claimed_at: string;
  redeemed_at: string | null;
  is_redeemed: boolean | null;
  user_name: string;
  user_phone: string;
  restaurant_name: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  amountFormatted?: string;
  currency: string;
  status: string;
  paymentMethod: string;
  razorpayPaymentId?: string;
  description: string;
  createdAt: string;
  restaurantName: string;
  userId: string;
}

/**
 * ADMIN DASHBOARD V4.0 - THE MASTERPIECE RELEASE
 * Premium UI + Full Feature Set + Indestructible Scalable Engine.
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["analysis"]));
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  
  // Data State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<UserWithRoles[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<BusinessWithOwner[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  
  // UI States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modifyRoleModalOpen, setModifyRoleModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [userToModify, setUserToModify] = useState<UserWithRoles | null>(null);
  const [manualSubModalOpen, setManualSubModalOpen] = useState(false);
  const [selectedSubForManual, setSelectedSubForManual] = useState<SubscriptionWithDetails | null>(null);
  const [subFilter, setSubFilter] = useState("all");
  const [downloadingQr, setDownloadingQr] = useState<string | null>(null);

  // Pagination & Search State
  const [pagination, setPagination] = useState<any>({
    users: { page: 1, total: 0 },
    partners: { page: 1, total: 0 },
    subs: { page: 1, total: 0 },
    logs: { page: 1, total: 0 },
    payments: { page: 1, total: 0 }
  });

  const [localSearch, setLocalSearch] = useState({
    users: "",
    partners: "",
    subs: "",
    payments: "",
    logs: ""
  });

  const [serverSearch, setServerSearch] = useState({
    users: "",
    partners: "",
    subs: "",
    payments: "",
    logs: ""
  });

  const checkAdminAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return null; }
      
      const { data: roleCheck } = await supabase.from("user_roles")
        .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

      if (!roleCheck) { navigate("/"); return null; }
      
      setIsAdmin(true);
      setCurrentUserId(user.id);
      return user;
    } catch (e) {
      navigate("/auth");
      return null;
    }
  }, [navigate]);

  const fetchMasterData = useCallback(async (isRefresh = false, scope = "overview", page = 1, search = "") => {
    // If it's just a regular tab switch and we have data, we might skip, 
    // but with pagination we usually want to fetch the specific page/search combo.
    
    if (isRefresh) toast.info(`Synchronizing ${scope.toUpperCase()}...`);
    setIsDataLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-admin-stats", {
        body: { scope, page, pageSize: 50, search }
      });
      if (error) throw error;

      // Update specific pools based on scope
      if (data.stats) setStats(data.stats);
      
      const count = data.total_count || 0;

      if (scope === "users") {
        setAllUsers(data.allUsers || []);
        setPagination(prev => ({ ...prev, users: { page, total: count } }));
      } else if (scope === "partners") {
        setAllBusinesses(data.allBusinesses || []);
        setPagination(prev => ({ ...prev, partners: { page, total: count } }));
      } else if (scope === "subs") {
        setSubscriptions(data.subscriptions || []);
        setPagination(prev => ({ ...prev, subs: { page, total: count } }));
      } else if (scope === "logs") {
        setRecentScans(data.recentScans || []);
        setRecentClaims(data.recentClaims || []);
        setPagination(prev => ({ ...prev, logs: { page, total: count } }));
      }
      
      setLoadedTabs(prev => new Set(prev).add(scope));
    } catch (e: any) {
      console.error("[DATA FAIL] Falling back to Direct SQL Link...", e);
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_master_admin_stats_v4", {
        p_user_id: currentUserId,
        p_scope: scope,
        p_page: page,
        p_page_size: 50,
        p_search: search
      });
      
      if (rpcErr) {
        console.error("[RPC FAIL]", rpcErr);
        toast.error("Cloud Gateway offline. Sync failed.");
      }

      if (rpcData) {
        if (rpcData.stats) setStats(rpcData.stats);
        const count = rpcData.total_count || 0;

        if (scope === "users") {
          setAllUsers(rpcData.allUsers || []);
          setPagination(prev => ({ ...prev, users: { page, total: count } }));
        } else if (scope === "partners") {
          setAllBusinesses(rpcData.allBusinesses || []);
          setPagination(prev => ({ ...prev, partners: { page, total: count } }));
        } else if (scope === "subs") {
          setSubscriptions(rpcData.subscriptions || []);
          setPagination(prev => ({ ...prev, subs: { page, total: count } }));
        } else if (scope === "logs") {
          setRecentScans(rpcData.recentScans || []);
          setRecentClaims(rpcData.recentClaims || []);
          setPagination(prev => ({ ...prev, logs: { page, total: count } }));
        }
      }
    } finally {
      setIsDataLoading(false);
      setIsInitializing(false);
    }
  }, [currentUserId]);

  const fetchPayments = useCallback(async (page = 1, search = "") => {
    setIsDataLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-payment-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: ANON_KEY },
        body: JSON.stringify({ page, pageSize: 50, search }),
      });
      const result = await response.json();
      if (result.payments) {
        setPayments(result.payments);
        setPagination(prev => ({ ...prev, payments: { page, total: result.total_count || 0 } }));
        setLoadedTabs(prev => new Set(prev).add("payments"));
      }
    } catch (e) { console.error("[PAYMENT FAIL]", e); } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => { 
      if (await checkAdminAuth()) { 
        await fetchMasterData(false, "overview"); 
      } 
    };
    init();
  }, [checkAdminAuth, fetchMasterData]);

  // Pagination Controls Component
  const PaginationControls = ({ current, total, onPageChange }: { current: number, total: number, onPageChange: (p: number) => void }) => {
    const totalPages = Math.ceil(total / 50);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-8 py-4 bg-slate-50 border-t">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
           PAGE {current} / {totalPages} ({total} ENTRIES)
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={current <= 1} 
            onClick={() => onPageChange(current - 1)}
            className="rounded-xl font-bold h-9 px-4 border-slate-200"
          >
            PREV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={current >= totalPages} 
            onClick={() => onPageChange(current + 1)}
            className="rounded-xl font-bold h-9 px-4 border-slate-200"
          >
            NEXT
          </Button>
        </div>
      </div>
    );
  };

  // Search Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setServerSearch(localSearch);
    }, 600);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Tab-Based Lazy Trigger & Pagination/Search watchers
  useEffect(() => {
    const scopeMap: any = {
      users: "users",
      biz: "partners",
      subs: "subs",
      activity: "logs",
      analysis: "partners"
    };

    const scope = scopeMap[activeTab];
    if (activeTab === "analysis") {
        fetchMasterData(false, "partners", 1, "");
        fetchMasterData(false, "subs", 1, "");
    } else if (scope) {
      // Map activeTab to the correct pagination/search key
      const keyMap: any = {
        users: "users",
        biz: "partners",
        subs: "subs",
        activity: "logs"
      };
      const dataKey = keyMap[activeTab] || activeTab;
      
      if (pagination[dataKey]) {
        fetchMasterData(false, scope, pagination[dataKey].page, serverSearch[dataKey]);
      }
    } else if (activeTab === "payments") {
      fetchPayments(pagination.payments.page, serverSearch.payments);
    }
  }, [activeTab, 
      pagination.users.page, serverSearch.users, 
      pagination.partners.page, serverSearch.partners, 
      pagination.subs.page, serverSearch.subs, 
      pagination.payments.page, serverSearch.payments, 
      pagination.logs.page, serverSearch.logs, 
      fetchMasterData, fetchPayments]);

  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: session ? `Bearer ${session.access_token}` : `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ targetUserId: userId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to delete user");
      
      toast.success("User permanently deleted");
      await fetchMasterData(false, "users", pagination.users.page, serverSearch.users);
    } catch (e: any) { 
      toast.error(`Deletion failed: ${e.message}`); 
    } finally {
      setIsDeletingUser(false);
      setDeleteModalOpen(false);
    }
  };

  const handleUpdateRoles = async (userId: string, newRoles: string[]) => {
    setIsUpdatingRole(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-update-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: session ? `Bearer ${session.access_token}` : `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ targetUserId: userId, newRoles }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to update roles");
      
      toast.success("User roles updated successfully");
      await fetchMasterData(false, "users", pagination.users.page, serverSearch.users);
    } catch (e: any) {
      toast.error(`Role update failed: ${e.message}`);
    } finally {
      setIsUpdatingRole(false);
      setModifyRoleModalOpen(false);
    }
  };

  const handleExtendTrial = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { targetUserId: userId, action: "extend_trial" }
      });
      if (error) throw error;
      toast.success("Trial extended by 3 days");
      await fetchMasterData();
    } catch (e: any) {
      toast.error(`Extension failed: ${e.message}`);
    }
  };

  const handleUnsubscribe = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this partner's access immediately?")) return;
    try {
      const { error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { targetUserId: userId, action: "revoke_access" }
      });
      if (error) throw error;
      toast.success("Partner access revoked");
      await fetchMasterData();
    } catch (e: any) {
      toast.error(`Unsubscribe failed: ${e.message}`);
    }
  };

  const handleManualSubscription = async (data: any) => {
     setIsUpdatingSub(true);
     try {
       const { error } = await supabase.functions.invoke("admin-update-subscription", { body: data });
       if (error) throw error;
       toast.success("Subscription granted successfully");
       await fetchMasterData();
       setManualSubModalOpen(false);
     } catch (e: any) { toast.error(`Update failed: ${e.message}`); } finally {
       setIsUpdatingSub(false);
     }
  };

  const handleDownloadQR = async (businessId: string, businessName: string) => {
    const svgElement = document.getElementById(`qr-svg-${businessId}`) as unknown as SVGSVGElement;
    if (!svgElement) { toast.error("QR Code not ready. Try again."); return; }
    
    setDownloadingQr(businessId);
    try {
      const blob = await generateQRPoster({ qrCodeSvg: svgElement, restaurantName: businessName });
      downloadBlob(blob, `QR_${businessName.replace(/\s+/g, '_')}.png`);
      toast.success("Poster generated successfully");
    } catch (err) { toast.error("Failed to generate poster"); } finally { setDownloadingQr(null); }
  };

  // --- FILTERS (Now Server-Side, keeping status filters as pass-through for now) ---
  const filteredSubs = useMemo(() => subscriptions.filter(s => {
    if (subFilter === "all") return true;
    if (subFilter === "manual") return s.admin_override === true;
    return s.status === subFilter;
  }), [subscriptions, subFilter]);

  if (isInitializing) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
          <div className="relative">
             <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
             <ShieldCheck className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">DRUTO EXECUTIVE ENGINE V4.0</p>
          <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
             <div className="h-full bg-primary animate-progress-buffer" style={{ width: '40%' }}></div>
          </div>
       </div>
     );
  }

  return (
    <PullToRefresh onRefresh={() => fetchMasterData(true)}>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* PREMIUM TOP BAR */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
           <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <ShieldCheck className="text-white w-7 h-7" />
                 </div>
                 <div>
                    <h1 className="text-2xl font-black italic tracking-tighter leading-none">ADMIN DASHBOARD</h1>
                    <div className="flex items-center gap-2 mt-1">
                       <Badge variant="secondary" className="bg-primary/10 text-primary font-mono text-[10px]">SCALABLE-V4.2</Badge>
                       <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Master Identity Active</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={() => fetchMasterData(true)} className="rounded-full">
                    <RefreshCw className={cn("w-5 h-5", isDataLoading && "animate-spin")} />
                 </Button>
                 <Button variant="destructive" size="sm" onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} className="rounded-full px-5 shadow-lg shadow-destructive/20">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                 </Button>
              </div>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
           {/* STATS GRID - PREMIUM CARDS */}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Users", val: stats?.totalUsers, icon: Users, color: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
                { label: "Partnered", val: stats?.totalBusinesses, icon: Store, color: "from-orange-500 to-amber-600", bg: "bg-orange-50" },
                { label: "Live Offers", val: stats?.totalRewards, icon: Gift, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50" },
                { label: "Total Scans", val: stats?.totalScans, icon: QrCodeIcon, color: "from-purple-500 to-violet-600", bg: "bg-purple-50" },
                { label: "Claimed", val: stats?.totalClaimedRewards, icon: Trophy, color: "from-pink-500 to-rose-600", bg: "bg-pink-50" },
                { label: "Retention", val: stats?.activeCards, icon: TrendingUp, color: "from-cyan-500 to-blue-600", bg: "bg-cyan-50" },
              ].map((m, idx) => (
                <Card key={idx} className="border-none shadow-xl shadow-slate-200/50 overflow-hidden group hover:-translate-y-1 transition-transform cursor-default">
                   <CardContent className="p-0">
                      <div className={cn("h-1.5 w-full bg-gradient-to-r", m.color)}></div>
                      <div className="p-5 flex flex-col items-center text-center">
                         <div className={cn("p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform", m.bg)}>
                            <m.icon className="w-6 h-6 text-slate-700" />
                         </div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{m.label}</p>
                         <h2 className="text-3xl font-black mt-1 text-slate-800">{m.val?.toLocaleString() ?? 0}</h2>
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>

           <Tabs defaultValue="analysis" onValueChange={setActiveTab} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <TabsList className="bg-white p-1.5 rounded-2xl shadow-xl shadow-slate-200/50 border h-auto flex-wrap justify-start">
                    <TabsTrigger value="users" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <Users className="w-4 h-4 mr-2" /> Users
                    </TabsTrigger>
                    <TabsTrigger value="biz" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <Store className="w-4 h-4 mr-2" /> Partners
                    </TabsTrigger>
                    <TabsTrigger value="subs" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <CreditCard className="w-4 h-4 mr-2" /> Subscriptions
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <Clock className="w-4 h-4 mr-2" /> Payments
                    </TabsTrigger>
                    <TabsTrigger value="marketing" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <Sparkles className="w-4 h-4 mr-2" /> Marketing
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <TrendingUp className="w-4 h-4 mr-2" /> Analysis
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                       <Activity className="w-4 h-4 mr-2" /> Logs
                    </TabsTrigger>
                 </TabsList>
              </div>

              {/* --- ANALYSIS TAB --- */}
              <TabsContent value="analysis">
                 <div className="space-y-6">
                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-widest opacity-60 mb-2">Total Executive Intelligence</h4>
                          <h2 className="text-3xl font-black italic">CONVERSION STRIKE TEAM</h2>
                       </div>
                       <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                          <Select defaultValue="usage" onValueChange={() => {}}>
                             <SelectTrigger className="bg-slate-800 border-slate-700 text-white font-bold h-12 w-full md:w-48 rounded-xl"><SelectValue placeholder="Sort By" /></SelectTrigger>
                             <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
                                <SelectItem value="usage">POWER USERS (SCANS)</SelectItem>
                                <SelectItem value="engagement">NEWEST PARTNERS</SelectItem>
                                <SelectItem value="critical">NON-PAYING LEADS</SelectItem>
                             </SelectContent>
                          </Select>
                          <Button variant="outline" className="h-12 border-slate-700 text-white bg-slate-800 hover:bg-slate-700 rounded-xl px-6 font-bold" onClick={() => fetchMasterData(true)}>
                             <RefreshCw className="w-4 h-4 mr-2" /> REFRESH LEADS
                          </Button>
                       </div>
                    </Card>

                    <Card className="lg:col-span-3 border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                       <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-6">
                          <div>
                             <CardTitle className="text-lg font-black flex items-center gap-2"><Store className="text-orange-500" /> SALES INTELLIGENCE (Top Usage Targets)</CardTitle>
                             <p className="text-xs text-muted-foreground font-medium mt-1">Sorting all partners by scan frequency to identify conversion potential.</p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 font-black border-none px-4 py-1.5 rounded-full text-[10px]">REAL-TIME SALES FEED</Badge>
                       </CardHeader>
                       <CardContent className="p-0">
                          <Table>
                             <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                   <TableHead className="pl-8 font-black text-slate-500 uppercase text-[10px] tracking-widest">Store / Category</TableHead>
                                   <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">Engagement Rank</TableHead>
                                   <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest">Conversation Lead (Contact)</TableHead>
                                   <TableHead className="pr-8 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest">Subscription Link</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {allBusinesses.slice()
                                  .sort((a,b) => (b.scan_count || 0) - (a.scan_count || 0))
                                  .map((b, idx) => {
                                     const sub = subscriptions.find(s => s.restaurant_id === b.id);
                                     return (
                                       <TableRow key={b.id} className="h-24 border-slate-100 hover:bg-slate-50/50 transition-colors">
                                          <TableCell className="pl-8">
                                             <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">#{idx+1}</div>
                                                <div className="flex flex-col leading-none">
                                                   <span className="font-black text-slate-800 uppercase tracking-tighter text-base">{b.name}</span>
                                                   <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-80 mt-1">{b.category || "General Marketplace"}</span>
                                                   <span className="text-[9px] text-primary font-bold mt-1 uppercase flex items-center gap-1"><MapPin className="w-2.5 h-2.5"/> {b.city || "Direct Hub"}</span>
                                                </div>
                                             </div>
                                          </TableCell>
                                          <TableCell className="text-center">
                                             <div className="inline-flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black text-slate-900 leading-none">{b.scan_count || 0}</span>
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">TOTAL SCANS</span>
                                             </div>
                                          </TableCell>
                                          <TableCell>
                                             <div className="flex flex-col">
                                                <span className="text-base font-black text-slate-800 flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-500" /> {b.owner_phone}</span>
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{b.owner_name}</span>
                                             </div>
                                          </TableCell>
                                          <TableCell className="pr-8 text-right">
                                             <div className="flex flex-col items-end gap-1.5">
                                                <Badge className={cn("rounded-full uppercase text-[9px] font-black tracking-widest border-none px-5 py-1", 
                                                   sub?.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                                                   sub?.status === 'trialing' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white')}>
                                                   {sub ? sub.status : "NO PLAN (HOT LEAD)"}
                                                </Badge>
                                                {(!sub || sub.status !== 'active') && (
                                                  <span className="text-[9px] font-bold text-orange-600 uppercase">Strong Conversion Signal</span>
                                                )}
                                             </div>
                                          </TableCell>
                                       </TableRow>
                                     );
                                  })
                                }
                             </TableBody>
                          </Table>
                       </CardContent>
                    </Card>
                 </div>
              </TabsContent>

               {/* --- USERS TAB --- */}
               <TabsContent value="users" className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                           placeholder="Search identity (Name, Phone, or UUID)..." 
                           className="pl-12 h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-primary"
                           value={localSearch.users}
                           onChange={(e) => setLocalSearch(prev => ({ ...prev, users: e.target.value }))}
                        />
                     </div>
                  </div>
 
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border overflow-hidden">
                     <Table>
                        <TableHeader className="bg-slate-50/50 h-16">
                           <TableRow className="border-none hover:bg-transparent">
                              <TableHead className="pl-8 font-bold text-slate-600">USER IDENTITY</TableHead>
                              <TableHead className="font-bold text-slate-600">CONTACT INFO</TableHead>
                              <TableHead className="font-bold text-slate-600">ACCESS LEVEL</TableHead>
                              <TableHead className="font-bold text-slate-600">JOINED ON</TableHead>
                              <TableHead className="text-right pr-8 font-bold text-slate-600">ACTION</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {allUsers.map((u) => (
                             <TableRow key={u.id} className="h-20 hover:bg-slate-50/50 transition-colors border-slate-100">
                                <TableCell className="pl-8">
                                   <div className="flex items-center gap-4">
                                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary border-2 border-white shadow-sm">
                                         {u.full_name?.charAt(0) || <Users className="w-5 h-5" />}
                                      </div>
                                      <div className="flex flex-col">
                                         <span className="font-bold text-slate-800">{u.full_name || "N/A"}</span>
                                         <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{u.id}</span>
                                      </div>
                                   </div>
                                </TableCell>
                                <TableCell>
                                   <div className="flex flex-col">
                                      <span className="text-sm font-bold flex items-center gap-1.5"><Phone className="w-3 h-3" /> {u.phone_number || "—"}</span>
                                      <span className="text-xs text-muted-foreground">{u.email || "—"}</span>
                                   </div>
                                </TableCell>
                                <TableCell>
                                   <div className="flex flex-wrap gap-1.5">
                                      {u.roles.map((r, i) => (
                                        <Badge key={i} variant={r === 'admin' ? "destructive" : r === 'restaurant_owner' ? "secondary" : "outline"} className="capitalize font-bold border-none">
                                           {r.replace('_', ' ')}
                                        </Badge>
                                      ))}
                                   </div>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-slate-500">
                                   {format(new Date(u.created_at), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                   <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                         <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100"><MoreVertical className="w-4 h-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 border-slate-200 shadow-xl">
                                         <DropdownMenuItem 
                                           className="rounded-lg font-medium py-2.5 cursor-pointer"
                                           onSelect={(e) => { 
                                             e.preventDefault(); 
                                             setUserToModify(u); 
                                             setModifyRoleModalOpen(true); 
                                           }}
                                         >
                                            <UserCog className="w-4 h-4 mr-2" /> Modify Roles
                                         </DropdownMenuItem>
                                         <DropdownMenuItem 
                                           className="rounded-lg font-medium py-2.5 text-destructive cursor-pointer"
                                           onSelect={(e) => { 
                                             e.preventDefault(); 
                                             setUserToDelete(u); 
                                             setDeleteModalOpen(true); 
                                           }}
                                         >
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                                         </DropdownMenuItem>
                                      </DropdownMenuContent>
                                   </DropdownMenu>
                                </TableCell>
                             </TableRow>
                           ))}
                           {allUsers.length === 0 && !isDataLoading && (
                              <TableRow><TableCell colSpan={5} className="h-60 text-center font-medium text-muted-foreground">Zero matches in the user directory.</TableCell></TableRow>
                           )}
                        </TableBody>
                     </Table>
                     <PaginationControls 
                         current={pagination.users.page} 
                         total={pagination.users.total} 
                         onPageChange={(p) => setPagination(prev => ({ ...prev, users: { ...prev.users, page: p } }))} 
                     />
                  </div>
               </TabsContent>

               {/* --- BUSINESS TAB --- */}
               <TabsContent value="biz" className="space-y-4">
                  <div className="flex items-center gap-3">
                     <Input 
                        placeholder="Search partners (Name, City or Owner)..." 
                        className="h-14 bg-white border-slate-200 rounded-2xl shadow-sm pl-6"
                        value={localSearch.partners}
                        onChange={(e) => setLocalSearch(prev => ({ ...prev, partners: e.target.value }))}
                     />
                  </div>
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border overflow-hidden">
                     <Table>
                        <TableHeader className="bg-slate-50/50 h-16">
                           <TableRow className="border-none hover:bg-transparent">
                              <TableHead className="pl-8 font-bold text-slate-600">BUSINESS NAME</TableHead>
                              <TableHead className="font-bold text-slate-600">OWNER CONTACT</TableHead>
                              <TableHead className="font-bold text-slate-600">LOCATION</TableHead>
                              <TableHead className="font-bold text-slate-600 text-center">SCANS</TableHead>
                              <TableHead className="text-right pr-8 font-bold text-slate-600">STATUS</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {allBusinesses.map((b) => (
                             <TableRow key={b.id} className="h-20 hover:bg-slate-50/50 transition-colors border-slate-100">
                                <TableCell className="pl-8">
                                   <div className="flex items-center gap-4">
                                      <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                                         <Store className="w-6 h-6 text-orange-600" />
                                      </div>
                                      <div className="flex flex-col">
                                         <span className="font-extrabold text-slate-800 uppercase tracking-tight">{b.name}</span>
                                         <span className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 rounded flex items-center gap-1 w-fit mt-0.5 uppercase"><Hash className="w-2 h-2" /> {b.id.slice(0,8)}</span>
                                      </div>
                                   </div>
                                </TableCell>
                                <TableCell>
                                   <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-700">{b.owner_name}</span>
                                      <span className="text-xs text-muted-foreground">{b.owner_phone}</span>
                                   </div>
                                </TableCell>
                                <TableCell>
                                   <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-500" /> {b.city || "—"}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                   <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-black text-xs px-3 py-1.5 rounded-full border border-blue-100">
                                      {b.scan_count || 0}
                                   </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                   <div className="flex items-center justify-end gap-2">
                                      {/* Hidden QR for Poster Generation */}
                                      <div className="hidden">
                                         <QRCodeSVG 
                                            id={`qr-svg-${b.id}`}
                                            value={`https://druto.me/scan/${b.id}`}
                                            size={1024}
                                         />
                                      </div>
                                      <Button variant="outline" size="sm" className="rounded-full shadow-sm hover:bg-slate-50 h-9 font-bold" onClick={() => handleDownloadQR(b.id, b.name)} disabled={downloadingQr === b.id}>
                                         {downloadingQr === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                                         QR
                                      </Button>
                                      <Badge className={cn("rounded-full px-4 h-9 flex items-center font-black border-none", b.is_active ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-400")}>
                                         {b.is_active ? "LIVE" : "DRAFT"}
                                      </Badge>
                                   </div>
                                </TableCell>
                             </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                     <PaginationControls 
                         current={pagination.partners.page} 
                         total={pagination.partners.total} 
                         onPageChange={(p) => setPagination(prev => ({ ...prev, partners: { ...prev.partners, page: p } }))} 
                     />
                  </div>
               </TabsContent>

               {/* --- SUBS TAB --- */}
               <TabsContent value="subs" className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3">
                     <Input 
                        placeholder="Search store or owner..." 
                        className="flex-1 h-14 bg-white border-slate-200 rounded-2xl shadow-sm pl-6" 
                        value={localSearch.subs} 
                        onChange={(e) => setLocalSearch(prev => ({ ...prev, subs: e.target.value }))} 
                     />
                     <Select value={subFilter} onValueChange={setSubFilter}>
                        <SelectTrigger className="w-full md:w-60 h-14 rounded-2xl bg-white shadow-sm font-bold border-slate-200"><SelectValue placeholder="All Status" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                           <SelectItem value="all">EVERYONE</SelectItem>
                           <SelectItem value="active">SUBSCRIBED</SelectItem>
                           <SelectItem value="manual">MANUAL OVERRIDES</SelectItem>
                           <SelectItem value="trialing">ON TRIAL</SelectItem>
                           <SelectItem value="trial_ended">TRIAL EXPIRED</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border overflow-hidden">
                     <Table>
                        <TableHeader className="bg-slate-50/50 h-16">
                           <TableRow className="border-none">
                              <TableHead className="pl-8 font-bold text-slate-600">PARTNER</TableHead>
                              <TableHead className="font-bold text-slate-600">PLAN TIER</TableHead>
                              <TableHead className="font-bold text-slate-600">BILLING CYCLE</TableHead>
                              <TableHead className="font-bold text-slate-600">STATUS</TableHead>
                              <TableHead className="text-right pr-8 font-bold text-slate-600">MASTER OVERRIDE</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubs.map(s => (
                            <TableRow key={s.id} className="h-20 border-slate-100 hover:bg-slate-50/50">
                               <TableCell className="pl-8">
                                  <div className="flex flex-col">
                                     <span className="font-black text-slate-800 text-sm">{s.restaurant_name}</span>
                                     <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">{s.owner_name}</span>
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <Badge variant="outline" className="font-black uppercase text-[10px] rounded-lg tracking-widest px-2 py-0.5 border-slate-200 bg-slate-50">{s.plan_tier || "STARTER"}</Badge>
                               </TableCell>
                               <TableCell>
                                  <div className="flex flex-col leading-tight">
                                     <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" /> 
                                        {s.status === 'active' ? "Sub Ends" : "Trial Ends"}
                                     </span>
                                     <span className="text-sm font-bold text-slate-600">
                                        {format(new Date(s.status === 'active' ? (s.current_period_end || s.trial_end) : s.trial_end), "MMM d, yyyy")}
                                     </span>
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <Badge className={cn("rounded-full px-4 h-8 flex items-center uppercase text-[10px] font-black tracking-widest border-none", 
                                     s.status === 'active' ? (s.admin_override ? "bg-purple-500" : "bg-emerald-500") : 
                                     s.status === 'trialing' ? "bg-blue-500" : "bg-red-500")}>
                                     {s.status === 'active' ? (s.admin_override ? "MANUAL ACTIVE" : "SUBSCRIBED") : s.status}
                                  </Badge>
                               </TableCell>
                               <TableCell className="text-right pr-8">
                                  <div className="flex items-center justify-end gap-2">
                                     {s.status === 'trialing' && (
                                        <Button variant="outline" size="sm" className="rounded-full shadow-sm font-black text-xs hover:bg-slate-100 border-slate-300 h-9" onClick={() => handleExtendTrial(s.user_id)}>
                                           <Plus className="w-3.5 h-3.5 mr-1" /> EXTEND
                                        </Button>
                                     )}
                                     <Button variant="outline" size="sm" className="rounded-full shadow-sm font-black text-xs hover:bg-slate-100 border-slate-300 h-9" onClick={() => { setSelectedSubForManual(s); setManualSubModalOpen(true); }}>
                                        <UserCog className="w-3.5 h-3.5 mr-1.5" /> CONTROL
                                     </Button>
                                     <Button variant="ghost" size="sm" className="rounded-full font-black text-[10px] text-destructive hover:bg-red-50 h-9 px-4" onClick={() => handleUnsubscribe(s.user_id)}>
                                        UNSUBSCRIBE
                                     </Button>
                                  </div>
                               </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                     </Table>
                     <PaginationControls 
                         current={pagination.subs.page} 
                         total={pagination.subs.total} 
                         onPageChange={(p) => setPagination(prev => ({ ...prev, subs: { ...prev.subs, page: p } }))} 
                     />
                  </div>
               </TabsContent>

              {/* --- PAYMENTS TAB --- */}
              <TabsContent value="payments" className="space-y-4">
                 <Input placeholder="Search Razorpay Payment ID or Business..." className="h-14 bg-white border-slate-200 rounded-2xl shadow-sm pl-6" value={localSearch.payments} onChange={(e) => setLocalSearch(prev => ({ ...prev, payments: e.target.value }))} />
                 <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border overflow-hidden">
                    <Table>
                       <TableHeader className="bg-slate-50/50 h-16">
                          <TableRow className="border-none">
                             <TableHead className="pl-8 font-bold text-slate-600">BUSINESS</TableHead>
                             <TableHead className="font-bold text-slate-600">TRANS. ID</TableHead>
                             <TableHead className="font-bold text-slate-600">PAYMENT METHOD</TableHead>
                             <TableHead className="font-bold text-slate-600">DATE</TableHead>
                             <TableHead className="text-right pr-8 font-bold text-slate-600">AMOUNT</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {payments.map(p => (
                            <TableRow key={p.id} className="h-20 border-slate-100">
                               <TableCell className="pl-8 font-extrabold text-slate-800">{p.restaurantName}</TableCell>
                               <TableCell>
                                  <code className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded tracking-tighter">{p.razorpayPaymentId || "DIRECT_SYNC"}</code>
                               </TableCell>
                               <TableCell>
                                  <Badge variant="outline" className="rounded-lg text-[10px] font-black uppercase text-slate-500 border-slate-200">{p.paymentMethod}</Badge>
                               </TableCell>
                               <TableCell className="text-xs font-bold text-slate-500">{format(new Date(p.createdAt), "MMM d, HH:mm")}</TableCell>
                               <TableCell className="text-right pr-8 font-black text-emerald-600 text-lg">
                                  ₹{p.amount / 100}
                               </TableCell>
                            </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                    <PaginationControls 
                        current={pagination.payments.page} 
                        total={pagination.payments.total} 
                        onPageChange={(p) => setPagination(prev => ({ ...prev, payments: { ...prev.payments, page: p } }))} 
                    />
                 </div>
              </TabsContent>

              {/* --- MARKETING TAB --- */}
              <TabsContent value="marketing" className="space-y-6">
                 <div className="grid lg:grid-cols-2 gap-8">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
                       <CardHeader className="bg-gradient-to-tr from-slate-50 to-white pb-6 border-b">
                          <CardTitle className="text-xl font-black flex items-center gap-2"><ImageIcon className="text-blue-500" /> TOP BANNERS</CardTitle>
                       </CardHeader>
                       <CardContent className="p-0">
                          <BannerManagement />
                       </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
                       <CardHeader className="bg-gradient-to-tr from-slate-50 to-white pb-6 border-b">
                          <CardTitle className="text-xl font-black flex items-center gap-2"><Sparkles className="text-amber-500" /> GLOBAL OWNER POPUPS</CardTitle>
                       </CardHeader>
                       <CardContent className="p-0">
                          <OwnerPopupManagement />
                       </CardContent>
                    </Card>
                 </div>
              </TabsContent>

              {/* --- LOGS TAB --- */}
              <TabsContent value="activity" className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                       <Input 
                          placeholder="Search logs by store, user or phone..." 
                          className="pl-12 h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-primary"
                          value={localSearch.logs}
                          onChange={(e) => setLocalSearch(prev => ({ ...prev, logs: e.target.value }))}
                       />
                    </div>
                 </div>

                 <div className="grid lg:grid-cols-2 gap-8">
                    <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden h-fit">
                       <CardHeader className="bg-slate-50/50 border-b">
                          <CardTitle className="text-lg font-black flex items-center gap-2"><QrCodeIcon className="text-violet-500" /> CRITICAL SCAN HISTORY</CardTitle>
                       </CardHeader>
                       <CardContent className="p-6">
                          <div className="space-y-4">
                             {recentScans.slice(0, 50).map(s => (
                               <div key={s.id} className="group p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-slate-100/80 transition-colors border-2 border-transparent hover:border-slate-200">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-700">{s.user_name?.charAt(0)}</div>
                                     <div className="flex flex-col">
                                        <span className="font-extrabold text-sm text-slate-800 leading-none">{s.user_name}</span>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-tighter">STORE: {s.restaurant_name}</span>
                                     </div>
                                  </div>
                                  <Badge variant="outline" className="font-mono text-[10px] h-7 px-3 bg-white border-slate-200">{format(new Date(s.scanned_at), "HH:mm, dd/MM")}</Badge>
                               </div>
                             ))}
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden h-fit">
                       <CardHeader className="bg-slate-50/50 border-b">
                          <CardTitle className="text-lg font-black flex items-center gap-2"><Trophy className="text-amber-500" /> REWARD DISBURSEMENT LOG</CardTitle>
                       </CardHeader>
                       <CardContent className="p-6">
                          <div className="space-y-4">
                             {recentClaims.slice(0, 50).map(c => (
                               <div key={c.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-slate-100 transition-colors">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-700">{c.user_name?.charAt(0)}</div>
                                     <div className="flex flex-col">
                                        <span className="font-extrabold text-sm text-slate-800 leading-none">{c.user_name}</span>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-tighter">SOURCE: {c.restaurant_name}</span>
                                     </div>
                                  </div>
                                  <Badge className={cn("font-black text-[10px] h-7 px-3 border-none", c.is_redeemed ? "bg-emerald-500" : "bg-amber-400")}>
                                     {c.is_redeemed ? "REDEEMED" : "CLAIMED"}
                                  </Badge>
                               </div>
                             ))}
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </TabsContent>
           </Tabs>
        </div>

        {/* MODALS */}
        <DeleteUserModal 
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={(id) => handleDeleteUser(id)}
          isDeleting={isDeletingUser}
          user={userToDelete ? { 
            ...userToDelete, 
            name: userToDelete.full_name || "Member", 
            phone: userToDelete.phone_number || "" 
          } as any : null}
        />

        <ModifyRolesModal
          isOpen={modifyRoleModalOpen}
          onClose={() => setModifyRoleModalOpen(false)}
          onConfirm={handleUpdateRoles}
          isUpdating={isUpdatingRole}
          user={userToModify ? {
            id: userToModify.id,
            name: userToModify.full_name || "Member",
            roles: userToModify.roles || []
          } : null}
        />

        <ManualSubscriptionModal 
            isOpen={manualSubModalOpen}
            onClose={() => { setManualSubModalOpen(false); setSelectedSubForManual(null); }}
            subscription={selectedSubForManual ? {
               userId: selectedSubForManual.user_id,
               restaurantName: selectedSubForManual.restaurant_name || "",
               ownerName: selectedSubForManual.owner_name || "",
               planTier: selectedSubForManual.plan_tier || "starter",
               razorpaySubscriptionId: selectedSubForManual.razorpay_subscription_id
            } : null}
            onConfirm={handleManualSubscription}
            isUpdating={isUpdatingSub}
        />
      </div>
    </PullToRefresh>
  );
};

export default AdminDashboard;
