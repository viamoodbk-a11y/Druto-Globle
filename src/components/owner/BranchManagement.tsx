import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranches } from "@/hooks/useBranches";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  Building2,
  TrendingUp,
  Navigation,
} from "lucide-react";
import type { PlanTier } from "@/hooks/useSubscription";

interface BranchManagementProps {
  restaurantId: string;
  planTier: PlanTier;
  maxBranches: number;
}

export const BranchManagement = ({
  restaurantId,
  planTier,
  maxBranches,
}: BranchManagementProps) => {
  const { toast } = useToast();
  const { branches, isLoading, addBranch, deleteBranch } = useBranches(restaurantId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter coordinates manually or use a modern browser.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewBranch(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast({
          title: "Location captured! 📍",
          description: `Coordinates: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location error",
          description: "Could not get your current location. Please check permissions.",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const totalLocationsUsed = branches.length + 1;
  const canAddMore = totalLocationsUsed < maxBranches;

  const handleAdd = async () => {
    if (!newBranch.name.trim() || !newBranch.address.trim()) {
      toast({ title: "Please fill in branch name and address", variant: "destructive" });
      return;
    }
    if (!newBranch.latitude || !newBranch.longitude) {
      toast({ title: "Please capture GPS location", description: "This is required for customer distance verification.", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    const result = await addBranch(newBranch);
    if (result.success) {
      toast({ title: "Branch added! 🎉" });
      setNewBranch({ name: "", address: "", latitude: null, longitude: null });
      setShowAddForm(false);
    } else {
      toast({ title: "Failed to add branch", description: result.error, variant: "destructive" });
    }
    setIsAdding(false);
  };

  const handleDelete = async (branchId: string) => {
    const result = await deleteBranch(branchId);
    if (result.success) {
      toast({ title: "Branch removed" });
    } else {
      toast({ title: "Failed to remove branch", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-card shadow-soft overflow-hidden border border-white/5">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Branch Locations</p>
            <p className="text-xs text-muted-foreground">
              {totalLocationsUsed}/{maxBranches} locations used
            </p>
          </div>
        </div>
        {canAddMore ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        ) : (
          <Link to="/pricing">
            <Button variant="outline" size="sm" className="text-primary border-primary/30">
              <TrendingUp className="h-4 w-4 mr-1" />
              Upgrade
            </Button>
          </Link>
        )}
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : branches.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
            No additional branches yet.
          </div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium text-foreground text-sm truncate">{branch.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{branch.address}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => handleDelete(branch.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <div className="border-t border-border/50 bg-muted/20 p-5 space-y-4 text-left">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
            <Input
              placeholder="e.g. Downtown Center"
              value={newBranch.name}
              onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Street Address</Label>
            <Input
              placeholder="Enter full address..."
              value={newBranch.address}
              onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
             <p className="text-[11px] text-muted-foreground leading-relaxed">
               Capture the exact GPS coordinates while you are standing at this location.
             </p>
             <Button 
               type="button" 
               variant="outline" 
               className="w-full h-11 rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/10"
               onClick={handleGetCurrentLocation}
               disabled={isGettingLocation}
             >
               {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
               {newBranch.latitude ? "Update Current Location" : "Save Current Location"}
             </Button>
             {newBranch.latitude && (
               <p className="text-center text-[10px] font-mono text-green-600 font-bold uppercase tracking-widest">
                 GPS Fixed: {newBranch.latitude.toFixed(6)}, {newBranch.longitude?.toFixed(6)}
               </p>
             )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 rounded-xl"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Branch
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

