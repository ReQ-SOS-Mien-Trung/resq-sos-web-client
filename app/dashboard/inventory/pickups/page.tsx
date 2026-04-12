"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowCounterClockwise,
  Truck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  PickupActivitiesPanel,
  ReturnActivitiesPanel,
} from "@/components/inventory/PickupActivitiesPanel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function PickupsPage() {
  const router = useRouter();
  const [activityMode, setActivityMode] = useState<"pickup" | "return">(
    "pickup",
  );

  return (
    <Tabs
      value={activityMode}
      onValueChange={(value) =>
        setActivityMode(value as "pickup" | "return")
      }
      className="flex flex-col bg-background"
    >
      {/* Header */}
      <header className="border-b bg-background px-6 py-4 shrink-0">
        <div className="flex flex-col gap-4">
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
                {activityMode === "pickup" ? (
                  <Truck className="h-5 w-5 text-primary" weight="fill" />
                ) : (
                  <ArrowCounterClockwise
                    className="h-5 w-5 text-primary"
                    weight="fill"
                  />
                )}
              </div>
              <div>
                <h1 className="text-2xl tracking-tighter font-bold text-foreground leading-tight">
                  Quản lý lấy và trả hàng
                </h1>
                <p className="text-sm tracking-tighter text-muted-foreground">
                  Theo dõi các hoạt động lấy hàng hiện trường, trả hàng về kho
                  và lịch sử xác nhận
                </p>
              </div>
            </div>
          </div>

          <TabsList className="h-auto w-fit rounded-xl border border-border/60 bg-muted/40 p-1">
            <TabsTrigger
              value="pickup"
              className="gap-2 rounded-lg px-4 py-2.5 text-sm"
            >
              <Truck className="h-4 w-4" weight="fill" />
              Hoạt động lấy hàng
            </TabsTrigger>
            <TabsTrigger
              value="return"
              className="gap-2 rounded-lg px-4 py-2.5 text-sm"
            >
              <ArrowCounterClockwise className="h-4 w-4" weight="fill" />
              Hoạt động trả hàng
            </TabsTrigger>
          </TabsList>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 py-6">
        <TabsContent value="pickup" className="mt-0">
          <PickupActivitiesPanel />
        </TabsContent>
        <TabsContent value="return" className="mt-0">
          <ReturnActivitiesPanel />
        </TabsContent>
      </main>
    </Tabs>
  );
}
