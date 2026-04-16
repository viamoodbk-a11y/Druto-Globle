import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Image as ImageIcon, Loader2, Megaphone, History, Users } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";

interface Campaign {
    id: string;
    title: string;
    body: string;
    image_url: string | null;
    sent_count: number;
    delivered_count: number;
    failed_count: number;
    opened_count: number;
    status: 'sending' | 'sent' | 'failed' | 'completed';
    created_at: string;
}

interface MarketingTabProps {
    restaurantId: string;
}

export const MarketingTab = ({ restaurantId }: MarketingTabProps) => {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [targetCount, setTargetCount] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const { uploadImage, isUploading } = useImageUpload();

    const calculateTargetAudience = async () => {
        if (!restaurantId) return;
        setIsCalculating(true);
        const authData = localStorage.getItem("druto_auth");
        if (!authData) {
            console.log("No auth data found in localStorage yet.");
            return;
        }

        const userId = JSON.parse(authData).userId;
        if (!userId) {
            console.log("No userId found in auth data.");
            return;
        }

        try {
            // STEP 1: Verify Supabase Session exists
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error("No active Supabase session found before calculating audience");
                toast.error("Session expired. Please log out and back in.", {
                    description: "Your security token is missing or invalid."
                });
                setIsCalculating(false);
                setTargetCount(0);
                return;
            }

            console.log("Invoking owner-send-push for calculation...", {
                restaurantId,
                userId,
                hasSession: !!session,
                tokenExp: session.expires_at
            });

            const { data, error } = await supabase.functions.invoke("owner-send-push", {
                body: {
                    restaurantId,
                    userId,
                    title: "CALCULATE_ONLY",
                    body: "CALCULATE_ONLY",
                    startDate: startDate || null,
                    endDate: endDate || null,
                }
            });

            if (error || !data?.success) {
                console.error("Audience calculation error:", {
                    error,
                    data,
                    restaurantId,
                    userId
                });

                // Broad check for 401/403 Unauthorized (Supabase session issues)
                const isUnauthorized =
                    error?.status === 401 ||
                    error?.status === 403 ||
                    (error?.message && (error.message.includes("401") || error.message.toLowerCase().includes("unauthorized"))) ||
                    (data?.error && (typeof data.error === 'string' && data.error.toLowerCase().includes("unauthorized"))) ||
                    data?.error?.status === 401;

                if (isUnauthorized) {
                    toast.error("Session expired. Please log out and back in.", {
                        description: "Your security token is no longer valid or has expired."
                    });
                } else if (error?.message?.includes("not found")) {
                    toast.error("Edge function not deployed! Please deploy owner-send-push.");
                } else if (data?.error) {
                    toast.error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
                } else {
                    toast.error("Failed to calculate audience. Check console for details.");
                }
                setTargetCount(0);
                return;
            }

            if (data?.success) {
                setTargetCount(data.sentCount);
            }
        } catch (err: any) {
            console.error("Error calculating audience:", err);
            toast.error(err?.message || "Error connecting to server");
            setTargetCount(0);
        } finally {
            setIsCalculating(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            calculateTargetAudience();
        }, 500);
        return () => clearTimeout(timer);
    }, [startDate, endDate, restaurantId]);

    const fetchCampaigns = async () => {
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from("notification_campaigns" as any)
                .select("*")
                .eq("restaurant_id", restaurantId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCampaigns((data as any[]) || []);
        } catch (err) {
            console.error("Error fetching campaigns:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const syncStats = async () => {
        if (!restaurantId) return;
        setIsSyncing(true);
        try {
            const { data, error } = await supabase.functions.invoke("check-push-receipts", {
                body: { restaurantId }
            });

            if (error) throw error;
            if (data?.success) {
                toast.success("Statistics updated!");
                fetchCampaigns();
            }
        } catch (err: any) {
            console.error("Error syncing stats:", err);
            toast.error("Failed to sync statistics");
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (restaurantId) {
            fetchCampaigns();
        }
    }, [restaurantId]);

    const handleSendPush = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error("Title and Message are required");
            return;
        }

        setIsSending(true);
        try {
            // STEP 1: Verify Supabase Session exists
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("Session expired. Please log out and back in.");
            }

            const authData = localStorage.getItem("druto_auth");
            const userId = authData ? JSON.parse(authData).userId : null;

            if (!userId) {
                throw new Error("User ID not found in security session");
            }

            const cleanTitle = title.trim();
            const cleanBody = body.trim();

            console.log("Invoking owner-send-push...", {
                restaurantId,
                userId,
                hasSession: !!session,
                tokenExp: session.expires_at
            });

            const { data, error } = await supabase.functions.invoke("owner-send-push", {
                body: {
                    restaurantId,
                    userId,
                    title: cleanTitle,
                    body: cleanBody,
                    imageUrl: uploadedUrl,
                    startDate: startDate || null,
                    endDate: endDate || null,
                }
            });

            if (error || !data?.success) {
                console.error("Push sending error details:", {
                    error,
                    data,
                    restaurantId,
                    userId
                });

                // Broad check for 401/403 Unauthorized (Supabase session issues)
                const isUnauthorized =
                    error?.status === 401 ||
                    error?.status === 403 ||
                    (error?.message && (error.message.includes("401") || error.message.toLowerCase().includes("unauthorized"))) ||
                    (data?.error && (typeof data.error === 'string' && data.error.toLowerCase().includes("unauthorized"))) ||
                    data?.error?.status === 401;

                if (isUnauthorized) {
                    throw new Error("Session expired. Please log out and back in.");
                }

                throw new Error(data?.error || data?.details || "Failed to send notification");
            }

            toast.success(`Successfully sent to ${data.sentCount} customers!`);

            // Reset form
            setTitle("");
            setBody("");
            setUploadedUrl(null);
            setStartDate("");
            setEndDate("");

            // Refresh history
            fetchCampaigns();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "An error occurred");
        } finally {
            setIsSending(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("Image must be smaller than 5MB");
                return;
            }
            const result = await uploadImage(file, "marketing", false);
            if (result.success && result.url) {
                setUploadedUrl(result.url);
            } else {
                toast.error(result.error || "Upload failed");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Column */}
                <div className="rounded-2xl bg-card border border-border/50 p-6 h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Megaphone className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-foreground">Send Push Notification</p>
                                <p className="text-sm text-muted-foreground">Engage recent customers by scan date</p>
                            </div>
                        </div>
                        {targetCount !== null && (
                            <div className="bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    {isCalculating ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        `${targetCount} Active Targets`
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">From Date (Optional)</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">To Date (Optional)</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Notification Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Weekend Special Offer!"
                                maxLength={50}
                            />
                            <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="body">Message Body *</Label>
                            <Textarea
                                id="body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="e.g., Get 50% off on your next coffee visit today!"
                                rows={3}
                                maxLength={150}
                            />
                            <p className="text-xs text-muted-foreground text-right">{body.length}/150</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Optional Image Attachment</Label>
                            <div className="flex items-center gap-4">
                                {uploadedUrl ? (
                                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                                        <img src={uploadedUrl} alt="Preview" className="h-full w-full object-cover" />
                                        <button
                                            onClick={() => setUploadedUrl(null)}
                                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 rounded-full h-5 w-5 flex items-center justify-center text-white text-[10px]"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                                        {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageChange}
                                        disabled={isUploading}
                                        className="text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Required format: JPG, PNG, WEBP. Max 5MB.</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSendPush}
                            disabled={isSending || isUploading || !title || !body || targetCount === 0}
                            className="w-full mt-2 h-12 text-base font-bold"
                        >
                            {isSending ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-5 w-5" />
                            )}
                            {targetCount === 0 ? "No Active Customers Found" : `Send Notification to ${targetCount || ''} Customers`}
                        </Button>
                    </div>
                </div>

                {/* Live Preview Column */}
                <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center justify-start overflow-hidden">
                    <h3 className="font-bold text-lg text-foreground w-full mb-6">Live Presentation Preview</h3>

                    {/* Mock Phone Container */}
                    <div className="relative w-[300px] h-[600px] rounded-[40px] border-[8px] border-zinc-900 bg-zinc-800 shadow-xl overflow-hidden shrink-0 flex flex-col pt-12">
                        {/* Dynamic Default Lock Screen Wallpaper */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-60 pointer-events-none" />
                        <div className="absolute inset-x-0 top-16 flex flex-col items-center justify-center gap-1 select-none pointer-events-none z-0">
                            <span className="text-6xl font-semibold text-white/90">
                                {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/ AM| PM/, '')}
                            </span>
                            <span className="text-sm font-medium text-white/90">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </span>
                        </div>

                        {/* Hardware Details (Notch/Dynamic Island) */}
                        <div className="absolute top-0 inset-x-0 flex justify-center z-20">
                            <div className="w-[100px] h-[25px] bg-zinc-900 rounded-b-2xl" />
                        </div>

                        {/* Push Notification Mock */}
                        <div className="relative z-10 w-full px-3 mt-32 space-y-2">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-sm relative overflow-hidden group transition-all duration-300">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-5 w-5 bg-[#900A12] rounded-md flex items-center justify-center">
                                            {/* Minimal App Icon Mock */}
                                            <div className="h-2.5 w-2.5 bg-white rounded-sm" />
                                        </div>
                                        <span className="text-xs tracking-wide font-medium text-zinc-600 uppercase">Druto</span>
                                    </div>
                                    <span className="text-xs font-medium text-zinc-500">now</span>
                                </div>
                                <div className="pr-2">
                                    <h4 className="font-bold text-sm text-zinc-900 leading-snug break-words">
                                        {title || "Your Notification Title"}
                                    </h4>
                                    <p className="text-[13px] text-zinc-700 leading-snug mt-1 break-words">
                                        {body || "This is how your message will look to your customers on their mobile devices."}
                                    </p>
                                </div>

                                {/* Rich Media Image Preview */}
                                {uploadedUrl && (
                                    <div className="mt-3 rounded-lg overflow-hidden relative bg-zinc-100 max-h-[160px]">
                                        <img
                                            src={uploadedUrl}
                                            alt="Push Notification Attachment"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Phone bottom bar */}
                        <div className="absolute bottom-2 inset-x-0 flex justify-center">
                            <div className="w-[120px] h-[4px] bg-white/30 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl bg-card border border-border/50 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-bold text-foreground">Campaign History</h2>
                    </div>
                    {campaigns.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={syncStats}
                            disabled={isSyncing}
                            className="h-8 text-xs font-semibold gap-1.5"
                        >
                            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                            Refresh Stats
                        </Button>
                    )}
                </div>

                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-6 bg-muted/30 rounded-xl">
                        <p className="text-sm text-muted-foreground">No push notifications sent yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {campaigns.map((camp) => (
                            <div key={camp.id} className="p-3 bg-muted/30 rounded-xl border border-border/50 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{camp.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {new Date(camp.created_at).toLocaleDateString()} at {new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="flex gap-1.5">
                                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                Sent: {camp.sent_count}
                                            </span>
                                            {camp.delivered_count > 0 && (
                                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    Delivered: {camp.delivered_count}
                                                </span>
                                            )}
                                            {camp.opened_count > 0 && (
                                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    Opened: {camp.opened_count}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${camp.status === 'completed' ? 'text-green-500' :
                                            camp.status === 'sending' ? 'text-blue-500 animate-pulse' :
                                                camp.status === 'failed' ? 'text-red-500' : 'text-muted-foreground'
                                            }`}>
                                            {camp.status || 'Sent'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{camp.body}</p>
                                {camp.image_url && (
                                    <p className="text-[10px] text-primary/70 mt-1 flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" /> Includes image attachment
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
