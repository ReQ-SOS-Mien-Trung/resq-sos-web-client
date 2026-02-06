"use client";

import { useState } from "react";
import { SOSCluster, Rescuer, AIDispatchDecision } from "@/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Rocket,
  Truck,
  Boat,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  Lightning,
  Path,
  Package,
  WarningCircle,
  CaretRight,
  ArrowRight,
} from "@phosphor-icons/react";

interface RescuePlanPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: SOSCluster | null;
  aiDecision: AIDispatchDecision | null;
  availableRescuers: Rescuer[];
  onApprove: () => void;
  onOverride: (rescuerId: string) => void;
}

const RescuePlanPanel = ({
  open,
  onOpenChange,
  cluster,
  aiDecision,
  availableRescuers,
  onApprove,
  onOverride,
}: RescuePlanPanelProps) => {
  const [selectedRescuer, setSelectedRescuer] = useState<string>("");
  const [activeTab, setActiveTab] = useState("plan");

  if (!cluster || !aiDecision) return null;

  const recommendedRescuer = aiDecision.recommendedRescuer;

  const handleApprove = () => {
    if (selectedRescuer && selectedRescuer !== recommendedRescuer.id) {
      onOverride(selectedRescuer);
    }
    onApprove();
  };

  const vehicleIcons = {
    TRUCK: <Truck className="h-5 w-5" weight="fill" />,
    MOTORBOAT: <Boat className="h-5 w-5" weight="fill" />,
    SMALL_BOAT: <Boat className="h-4 w-4" weight="fill" />,
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-[900] transition-all duration-500 ease-out",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none",
      )}
      style={{ right: 420 }} // Leave space for ClusterDetailsPanel
    >
      <div className="h-full bg-background/98 backdrop-blur-sm border-t border-r shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b shrink-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Rocket
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  weight="fill"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold">Kế hoạch giải cứu</h2>
                <p className="text-sm text-muted-foreground">
                  Cụm SOS #{cluster.id.split("-")[1]} • {cluster.totalVictims}{" "}
                  nạn nhân
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                AI Đề xuất
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <div className="px-4 pt-3 border-b shrink-0">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="plan" className="gap-2">
                    <Path className="h-4 w-4" />
                    Lộ trình
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="gap-2">
                    <Package className="h-4 w-4" />
                    Tài nguyên
                  </TabsTrigger>
                  <TabsTrigger value="team" className="gap-2">
                    <Users className="h-4 w-4" />
                    Đội cứu hộ
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                {/* Route Plan Tab */}
                <TabsContent value="plan" className="m-0 p-4">
                  <div className="space-y-4">
                    {/* AI Reasoning */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Lightning
                            className="h-4 w-4 text-yellow-500"
                            weight="fill"
                          />
                          Phân tích AI
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {aiDecision.reasoning}
                      </CardContent>
                    </Card>

                    {/* Route Steps */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">
                        Các bước thực hiện
                      </h3>
                      <div className="space-y-3">
                        {aiDecision.proposedPlan.map((step, index) => (
                          <div key={index} className="flex gap-3 items-start">
                            <div className="flex flex-col items-center">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                                  index === 0
                                    ? "bg-emerald-500"
                                    : "bg-blue-500",
                                )}
                              >
                                {index + 1}
                              </div>
                              {index < aiDecision.proposedPlan.length - 1 && (
                                <div className="w-0.5 h-12 bg-border mt-1" />
                              )}
                            </div>
                            <Card className="flex-1">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {step.action === "PICKUP_SUPPLIES"
                                      ? "Lấy vật tư"
                                      : step.action === "GO_TO_VICTIM"
                                        ? "Đến nạn nhân"
                                        : step.action === "TRANSPORT_TO_SAFETY"
                                          ? "Vận chuyển"
                                          : "Trở về"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {step.estimatedTime} phút
                                  </span>
                                </div>
                                <p className="text-sm font-medium">
                                  {step.details}
                                </p>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {step.location.lat.toFixed(4)},{" "}
                                  {step.location.lng.toFixed(4)}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time Estimate */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-emerald-600">
                              {aiDecision.proposedPlan.reduce(
                                (acc, step) => acc + step.estimatedTime,
                                0,
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Phút di chuyển
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {cluster.totalVictims}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Nạn nhân cần cứu
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-orange-600">
                              {aiDecision.proposedPlan.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Điểm dừng
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="m-0 p-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Vật tư cần thiết
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold">5</div>
                            <div className="text-xs text-muted-foreground">
                              Áo phao
                            </div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold">10</div>
                            <div className="text-xs text-muted-foreground">
                              Phần thực phẩm
                            </div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold">2</div>
                            <div className="text-xs text-muted-foreground">
                              Kit y tế
                            </div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold">15</div>
                            <div className="text-xs text-muted-foreground">
                              Lít nước
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Nguồn cung cấp
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Package className="h-8 w-8 text-blue-500" />
                          <div>
                            <div className="font-medium">Kho vật tư Huế</div>
                            <div className="text-xs text-muted-foreground">
                              Cách 2.5km • Đầy đủ vật tư
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Team Tab */}
                <TabsContent value="team" className="m-0 p-4">
                  <div className="space-y-4">
                    {/* Recommended Rescuer */}
                    <Card className="border-emerald-200 dark:border-emerald-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle
                            className="h-4 w-4 text-emerald-500"
                            weight="fill"
                          />
                          Đội cứu hộ được đề xuất
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            {vehicleIcons[recommendedRescuer.type]}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">
                              {recommendedRescuer.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {recommendedRescuer.capabilities.join(", ")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Tải: {recommendedRescuer.currentLoad}/
                              {recommendedRescuer.capacity}
                            </div>
                          </div>
                          <Badge variant="success">Sẵn sàng</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Override Selection */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <WarningCircle className="h-4 w-4 text-orange-500" />
                          Thay đổi đội cứu hộ (Tuỳ chọn)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={selectedRescuer}
                          onValueChange={setSelectedRescuer}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn đội cứu hộ khác..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRescuers
                              .filter((r) => r.id !== recommendedRescuer.id)
                              .map((rescuer) => (
                                <SelectItem key={rescuer.id} value={rescuer.id}>
                                  <div className="flex items-center gap-2">
                                    {vehicleIcons[rescuer.type]}
                                    <span>{rescuer.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Huỷ bỏ
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              onClick={handleApprove}
            >
              <CheckCircle className="h-5 w-5 mr-2" weight="fill" />
              Phê duyệt & Gửi nhiệm vụ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescuePlanPanel;
