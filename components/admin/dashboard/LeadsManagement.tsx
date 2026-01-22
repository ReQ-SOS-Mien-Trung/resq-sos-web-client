"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import type { LeadsData } from "@/types/admin-dashboard";

interface LeadsManagementProps {
  data: LeadsData;
}

const categoryColors: Record<string, string> = {
  Qualified: "from-violet-500 to-purple-600",
  Contacted: "from-purple-400 to-violet-500",
  Lost: "from-pink-400 to-rose-500",
  Won: "from-emerald-400 to-green-500",
  Website: "from-blue-400 to-cyan-500",
  Referral: "from-amber-400 to-orange-500",
  Social: "from-pink-400 to-red-500",
  Hot: "from-red-500 to-orange-500",
  Warm: "from-amber-400 to-yellow-500",
  Cold: "from-blue-400 to-indigo-500",
};

export function LeadsManagement({ data }: LeadsManagementProps) {
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
                <div
                  className={cn(
                    "h-full bg-gradient-to-r rounded-lg transition-all duration-700 ease-out",
                    "flex items-center justify-end pr-3",
                    "group-hover:shadow-lg group-hover:shadow-purple-500/20",
                    colorClass,
                  )}
                  style={{
                    width: `${(category.value / maxValue) * 100}%`,
                    animationDelay: `${index * 150}ms`,
                  }}
                >
                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                    {category.percentage}%
                  </span>
                </div>
                {/* Hover effect shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
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
            Leads Management
          </CardTitle>
          <MoreVertical className="h-4 w-4 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
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
              className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              Status
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              Sources
            </TabsTrigger>
            <TabsTrigger
              value="qualification"
              className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              Qualification
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
}
