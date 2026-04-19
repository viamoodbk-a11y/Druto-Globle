import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, UserX, Trash2 } from "lucide-react";

interface UserToDelete {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  roles: string[];
}

interface DeleteUserModalProps {
  user: UserToDelete | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteUserModal = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteUserModalProps) => {
  const handleConfirm = async () => {
    if (user) {
      await onConfirm(user.id);
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <UserX className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl">Delete User</DialogTitle>
          <DialogDescription className="text-center">
            This action cannot be undone. The user and all their data will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Details Card */}
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {user.name || "No name"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.phone || user.email || "No contact info"}
                </p>
              </div>
            </div>

            {/* Roles */}
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    role === "admin"
                      ? "bg-purple-500/10 text-purple-600"
                      : role === "restaurant_owner"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  {role === "restaurant_owner" ? "Owner" : role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl bg-destructive/5 border border-destructive/20 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium mb-1">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-0.5 text-destructive/80">
                <li>User profile and account</li>
                <li>All loyalty cards and stamps</li>
                <li>All claimed rewards</li>
                {user.roles.includes("restaurant_owner") && (
                  <li>Business listings and QR codes</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
