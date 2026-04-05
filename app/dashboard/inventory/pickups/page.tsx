"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Truck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PickupActivitiesPanel } from "@/components/inventory/PickupActivitiesPanel";

export default function PickupsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/dashboard/inventory")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div>
              <h1 className="text-2xl tracking-tighter font-bold text-foreground leading-tight">
                Hoạt động lấy hàng
              </h1>
              <p className="text-sm tracking-tighter text-muted-foreground">
                Xem các hoạt động lấy hàng sắp tới và lịch sử giao nhận tại kho
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 py-6">
        <PickupActivitiesPanel />
      </main>
    </div>
  );
}
