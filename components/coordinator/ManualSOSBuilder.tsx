"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CoordinatorSOSForm from "@/components/coordinator/CoordinatorSOSForm";

interface ManualSOSBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickedLocation: { lat: number; lng: number } | null;
  onPickLocationMode: () => void;
  onSuccess?: () => void;
}

export function ManualSOSBuilder({
  open,
  onOpenChange,
  pickedLocation,
  onPickLocationMode,
  onSuccess,
}: ManualSOSBuilderProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[1280px] overflow-y-auto rounded-none border-2 border-black">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            Tạo yêu cầu SOS thủ công
          </DialogTitle>
          <DialogDescription>
            Form này dùng chung logic với trang create-sos của coordinator.
          </DialogDescription>
        </DialogHeader>

        <CoordinatorSOSForm
          mode="dialog"
          pickedLocation={pickedLocation}
          onPickLocationMode={onPickLocationMode}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
