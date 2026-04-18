"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleNotch, Warning } from "@phosphor-icons/react";
import type { PromptEntity } from "@/services/prompt/type";

type DeletePromptDialogProps = {
  prompt: PromptEntity | null;
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const DeletePromptDialog = ({
  prompt,
  open,
  isDeleting,
  onClose,
  onConfirm,
}: DeletePromptDialogProps) => {
  if (!prompt) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Warning size={20} weight="fill" />
            Xóa bản nháp mẫu lệnh
          </DialogTitle>
          <DialogDescription>
            Bạn sắp xóa bản nháp{" "}
            <strong className="text-foreground">
              &quot;{prompt.name}&quot;
            </strong>{" "}
            ({prompt.version || "—"}). Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <CircleNotch size={16} className="mr-2 animate-spin" />
            ) : null}
            Xóa bản nháp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePromptDialog;
