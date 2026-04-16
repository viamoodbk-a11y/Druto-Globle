import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CreditCard, Loader2, CheckCircle, Calendar } from "lucide-react";

interface SubscriptionToUpdate {
    userId: string;
    restaurantName: string;
    ownerName: string;
    planTier: string;
    razorpaySubscriptionId?: string | null;
}

interface ManualSubscriptionModalProps {
    subscription: SubscriptionToUpdate | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        targetUserId: string;
        action: string;
        duration: string;
        adminNotes: string;
        razorpaySubscriptionId: string;
        planTier: string;
    }) => Promise<void>;
    isUpdating: boolean;
}

export const ManualSubscriptionModal = ({
    subscription,
    isOpen,
    onClose,
    onConfirm,
    isUpdating,
}: ManualSubscriptionModalProps) => {
    const [duration, setDuration] = useState("year");
    const [adminNotes, setAdminNotes] = useState("");
    const [razorpayId, setRazorpayId] = useState("");
    const [planTier, setPlanTier] = useState("starter");

    useEffect(() => {
        if (subscription) {
            setPlanTier(subscription.planTier || "starter");
            setRazorpayId(subscription.razorpaySubscriptionId || "");
            setAdminNotes("");
            setDuration("year");
        }
    }, [subscription]);

    const handleConfirm = async () => {
        if (subscription) {
            await onConfirm({
                targetUserId: subscription.userId,
                action: "grant_access",
                duration,
                adminNotes,
                razorpaySubscriptionId: razorpayId,
                planTier,
            });
            onClose();
        }
    };

    if (!subscription) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">Manual Activation</DialogTitle>
                    <DialogDescription className="text-center">
                        Manually activate subscription for <strong>{subscription.restaurantName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="plan">Plan Tier</Label>
                        <Select value={planTier} onValueChange={setPlanTier}>
                            <SelectTrigger id="plan">
                                <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="starter">Starter (₹999)</SelectItem>
                                <SelectItem value="growth">Growth (₹2499)</SelectItem>
                                <SelectItem value="pro">Pro (₹4999)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="duration">Access Duration</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger id="duration">
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">1 Month (30 days)</SelectItem>
                                <SelectItem value="year">1 Year (366 days)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="razorpayId">Razorpay Subscription ID (Optional)</Label>
                        <Input
                            id="razorpayId"
                            placeholder="sub_..."
                            value={razorpayId}
                            onChange={(e) => setRazorpayId(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Admin Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Reason for manual activation (e.g., Offline payment received)"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isUpdating} className="gap-2">
                        {isUpdating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Activate Now
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
