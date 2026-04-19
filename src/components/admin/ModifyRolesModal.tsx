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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserCog, ShieldAlert } from "lucide-react";

interface UserToModify {
  id: string;
  name: string | null;
  roles: string[];
}

interface ModifyRolesModalProps {
  user: UserToModify | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string, newRoles: string[]) => Promise<void>;
  isUpdating: boolean;
}

const AVAILABLE_ROLES = [
  { id: "customer", label: "Customer" },
  { id: "restaurant_owner", label: "Partner (Owner)" },
  { id: "admin", label: "Administrator" }
];

export const ModifyRolesModal = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  isUpdating,
}: ModifyRolesModalProps) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (user && isOpen) {
      setSelectedRoles(user.roles || ["customer"]);
    }
  }, [user, isOpen]);

  const handleConfirm = async () => {
    if (user) {
      // make sure customer is always there 
      let finalRoles = [...selectedRoles];
      if (finalRoles.length === 0) finalRoles = ["customer"];
      await onConfirm(user.id, finalRoles);
      onClose();
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
            <UserCog className="h-8 w-8 text-blue-500" />
          </div>
          <DialogTitle className="text-center text-xl">Modify User Roles</DialogTitle>
          <DialogDescription className="text-center">
            Update access permissions for {user.name || "User"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-xl border p-4 space-y-4">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.id} className="flex flex-row items-start space-x-3 space-y-0 relative">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                  className="mt-1"
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {role.id === 'customer' && "Standard access to claim rewards"}
                    {role.id === 'restaurant_owner' && "Can manage a single business profile"}
                    {role.id === 'admin' && "Master access to this entire dashboard"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {selectedRoles.includes("admin") && !user.roles.includes("admin") && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-600">
                <p className="font-medium mb-1">Warning: Admin Privileges</p>
                <p className="text-amber-600/80">You are about to grant master administrator access. They will be able to delete users and modify anything.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUpdating || selectedRoles.length === 0}
            className="w-full sm:w-auto font-bold bg-primary text-primary-foreground"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Roles"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
