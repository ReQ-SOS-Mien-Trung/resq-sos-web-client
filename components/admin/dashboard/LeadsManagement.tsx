"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { LeadsManagementProps } from "@/type";
import { categoryColors } from "@/lib/constants";

const LeadsManagement = ({ data }: LeadsManagementProps) => {
  const [activeTab, setActiveTab] = useState("status");

  const renderBarChart = (categories: typeof data.status) => {
    const maxValue = Math.max(...categories.map((c) => c.value));

    return (
      <div className="space-y-4 mt-4">
        {categories.map((category, index) => {
          const colorClass =
            categoryColors[category.name] || "from-purple-500 to-violet-600";
          return (
            <div
              key={index}
              className="space-y-2 animate-in fade-in slide-in-from-left-4"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground/90">
                  {category.name}
                </span>
              </div>
              <div className="relative h-9 bg-muted/50 rounded-lg overflow-hidden group cursor-pointer">
                {(() => {
                  const percent = (category.value / maxValue) * 100;
                  const isTiny = percent < 12;
                  return (
                    <>
                      <div
                        className={cn(
                          "h-full bg-linear-to-r rounded-lg transition-all duration-700 ease-out",
                          isTiny
                            ? "flex items-center justify-start pl-3"
                            : "flex items-center justify-end pr-3",
                          "group-hover:shadow-lg group-hover:shadow-purple-500/20",
                          colorClass,
                        )}
                        style={{
                          width: `${percent}%`,
                          minWidth: isTiny ? "56px" : undefined,
                          animationDelay: `${index * 150}ms`,
                        }}
                      >
                        {!isTiny && (
                          <span className="text-sm tracking-tighter font-semibold text-white drop-shadow-sm">
                            {category.percentage}%
                          </span>
                        )}
                      </div>
                      {isTiny && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm tracking-tighter font-semibold text-foreground/90">
                          {category.percentage}%
                        </span>
                      )}
                    </>
                  );
                })()}
                {/* Hover effect shine */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Quản lý yêu cầu cứu hộ
          </CardTitle>
          <DotsThreeVertical
            size={16}
            className="text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="status"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger
              value="status"
              className="text-sm tracking-tighter font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              Trạng thái
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="text-sm tracking-tighter font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              Nguồn
            </TabsTrigger>
            <TabsTrigger
              value="qualification"
              className="text-sm tracking-tighter font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              Mức độ
            </TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="mt-2">
            {renderBarChart(data.status)}
          </TabsContent>
          <TabsContent value="sources" className="mt-2">
            {renderBarChart(data.sources)}
          </TabsContent>
          <TabsContent value="qualification" className="mt-2">
            {renderBarChart(data.qualification)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LeadsManagement;
