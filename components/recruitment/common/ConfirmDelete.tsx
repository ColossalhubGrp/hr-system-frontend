"use client";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { useState } from "react";

interface ConfirmDeleteProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  onConfirm: () => Promise<any>;
  onAfterDelete?: () => void; 
}

export default function ConfirmDelete({
  trigger,
  title = "Delete Item",
  description = "Are you sure you want to delete this? This action cannot be undone.",
  onConfirm,
  onAfterDelete,
}: ConfirmDeleteProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await onConfirm();
      if (res?.success === false) {
        toast.error(res.message || res.error || "Failed to delete");
      } else {
        toast.success("Deleted successfully");
        onAfterDelete?.();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <button className="text-red-600 underline">Delete</button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
